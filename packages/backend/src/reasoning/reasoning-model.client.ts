import type Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { MessageParam, Tool, ToolResultBlockParam, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';
import { ReasoningToolError } from './reasoning-tool.error';
import type { CompletionInput } from './types/completion-input';
import type { ReasoningModelSettings } from './types/reasoning-model-settings';
import type { ReasoningTool } from './types/reasoning-tool';
import type { ToolLoopInput } from './types/tool-loop-input';

/**
 * Thin wrapper around the Anthropic API for a reasoning model. Calls are text-only, with adaptive
 * thinking; screenshots never reach this client. Strategy and Unit reasoning use it with the default
 * model; levels with their own model get a subclass (`JobReasoningModelClient`, `TaskReasoningModelClient`).
 * `ReasoningModule` builds each one from config.
 */
export class ReasoningModelClient {
  constructor(
    private readonly anthropic: Anthropic,
    private readonly settings: ReasoningModelSettings,
  ) {}

  /**
   * Sends one prompt and returns the reply parsed against `input.schema`. The schema is sent as the
   * output format, so the model can think first and still must answer in that shape. Throws when the
   * reply is cut off, refused, or doesn't match.
   */
  async completeStructured<TOutput>(input: CompletionInput<TOutput>): Promise<TOutput> {
    const message = await this.anthropic.messages.parse({
      model: this.settings.modelId,
      max_tokens: input.maxTokens,
      system: input.systemPrompt,
      messages: [{ role: 'user', content: input.userPrompt }],
      thinking: { type: 'adaptive' },
      output_config: { effort: this.settings.effort, format: zodOutputFormat(input.schema) },
    });
    if (message.stop_reason !== 'end_turn' || message.parsed_output === null) {
      throw new Error(`Reasoning model gave no structured answer (stop reason: ${message.stop_reason ?? 'unknown'})`);
    }
    return message.parsed_output;
  }

  /**
   * Runs the model with tools until it calls the tool that ends the loop. Every call is checked against
   * the tool's schema; a rejected or invalid call goes back to the model as an error result. Throws when
   * a turn is cut off or the loop has not ended after `maxTurns` turns.
   */
  async runToolLoop(input: ToolLoopInput): Promise<void> {
    const tools = new Map(input.tools.map((tool) => [tool.name, tool]));
    const endTool = input.tools.find((tool) => tool.endsLoop)?.name ?? 'the final tool';
    const messages: MessageParam[] = [{ role: 'user', content: input.userPrompt }];

    for (let turn = 0; turn < input.maxTurns; turn++) {
      const message = await this.anthropic.messages.create({
        model: this.settings.modelId,
        max_tokens: input.maxTokens,
        system: input.systemPrompt,
        messages,
        thinking: { type: 'adaptive' },
        output_config: { effort: this.settings.effort },
        tools: input.tools.map((tool) => this.toToolParam(tool)),
      });
      if (message.stop_reason === 'max_tokens' || message.stop_reason === 'refusal') {
        throw new Error(`Reasoning model stopped mid-loop (stop reason: ${message.stop_reason})`);
      }
      messages.push({ role: 'assistant', content: message.content });

      const calls = message.content.filter((block): block is ToolUseBlock => block.type === 'tool_use');
      if (calls.length === 0) {
        messages.push({ role: 'user', content: `Continue by calling a tool. Call ${endTool} when you are done.` });
        continue;
      }
      const results = calls.map((call) => this.runTool(tools.get(call.name), call));
      messages.push({ role: 'user', content: results.map((result) => result.block) });
      if (results.some((result) => result.endsLoop)) return;
    }
    throw new Error(`Reasoning model did not call ${endTool} within ${input.maxTurns} turns`);
  }

  private runTool(
    tool: ReasoningTool | undefined,
    call: ToolUseBlock,
  ): { block: ToolResultBlockParam; endsLoop: boolean } {
    const result = (content: string, isError: boolean) => ({
      block: { type: 'tool_result' as const, tool_use_id: call.id, content, is_error: isError },
      endsLoop: !isError && tool?.endsLoop === true,
    });
    if (tool === undefined) return result(`Unknown tool ${call.name}.`, true);

    const parsed = tool.inputSchema.safeParse(call.input);
    if (!parsed.success) return result(`Invalid input: ${parsed.error.message}`, true);
    try {
      return result(tool.run(parsed.data), false);
    } catch (error) {
      if (error instanceof ReasoningToolError) return result(error.message, true);
      throw error;
    }
  }

  private toToolParam(tool: ReasoningTool): Tool {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: zodOutputFormat(tool.inputSchema).schema as Tool['input_schema'],
      strict: true,
    };
  }
}
