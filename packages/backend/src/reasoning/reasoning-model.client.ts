import type Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { MessageParam, Tool, ToolResultBlockParam, ToolUnion, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';
import { ReasoningToolError } from './reasoning-tool.error';
import type { CompletionInput } from './types/completion-input';
import type { ReasoningModelSettings } from './types/reasoning-model-settings';
import type { ReasoningTool } from './types/reasoning-tool';
import type { ToolLoopInput } from './types/tool-loop-input';

/** How many times a call that searches the web may hand the turn back unfinished before we give up. */
const MAX_PAUSED_TURNS = 5;

/** Most tokens one fetched page may add to the prompt, so a long page cannot crowd out the rest. */
const WEB_FETCH_MAX_CONTENT_TOKENS = 20_000;

/**
 * Thin wrapper around the Anthropic API for a reasoning model, with adaptive thinking. Calls are text,
 * except that Job review and the evaluator may attach a visual Task's final screenshot. Strategy
 * reasoning and the evaluator use it with the default model; levels with their own model get a
 * subclass (`JobReasoningModelClient`, `TaskReasoningModelClient`).
 * `ReasoningModule` builds each one from config.
 */
export class ReasoningModelClient {
  constructor(
    private readonly anthropic: Anthropic,
    private readonly settings: ReasoningModelSettings,
  ) {}

  /**
   * Sends one prompt and returns the reply parsed against `input.schema`. The schema is sent as the
   * output format, so the model can think first and still must answer in that shape. With
   * `input.webSearch` or `input.webFetch` it may also search or read pages before answering; the API runs
   * those tools itself, which is why no tool has to be executed here. Throws when the reply is cut off, refused, or doesn't match.
   */
  async completeStructured<TOutput>(input: CompletionInput<TOutput>): Promise<TOutput> {
    const tools = this.webTools(input);
    const messages: MessageParam[] = [{ role: 'user', content: this.userContent(input) }];

    for (let pause = 0; pause <= MAX_PAUSED_TURNS; pause++) {
      const message = await this.anthropic.messages.parse({
        model: this.settings.modelId,
        max_tokens: input.maxTokens,
        system: input.systemPrompt,
        messages,
        thinking: { type: 'adaptive' },
        output_config: { effort: this.settings.effort, format: zodOutputFormat(input.schema) },
        tools,
      });
      // Searching can run long enough that the API hands the turn back unfinished. Returning its own
      // work lets it pick up where it stopped instead of starting the judgement again.
      if (message.stop_reason === 'pause_turn') {
        messages.push({ role: 'assistant', content: message.content });
        continue;
      }
      if (message.stop_reason !== 'end_turn' || message.parsed_output === null) {
        throw new Error(`Reasoning model gave no structured answer (stop reason: ${message.stop_reason ?? 'unknown'})`);
      }
      return message.parsed_output;
    }
    throw new Error(`Reasoning model paused more than ${MAX_PAUSED_TURNS} times without answering`);
  }

  /** The web tools the call allows, run by the API itself; undefined when it allows none. */
  private webTools(input: CompletionInput<unknown>): ToolUnion[] | undefined {
    const tools: ToolUnion[] = [];
    if (input.webSearch !== undefined) {
      tools.push({ type: 'web_search_20260318', name: 'web_search', max_uses: input.webSearch.maxSearches });
    }
    if (input.webFetch !== undefined) {
      tools.push({
        type: 'web_fetch_20260318',
        name: 'web_fetch',
        max_uses: input.webFetch.maxFetches,
        max_content_tokens: WEB_FETCH_MAX_CONTENT_TOKENS,
      });
    }
    return tools.length === 0 ? undefined : tools;
  }

  /** The prompt alone, or the images first and the prompt after them, which is how the model reads images best. */
  private userContent(input: CompletionInput<unknown>): MessageParam['content'] {
    if (input.images === undefined || input.images.length === 0) return input.userPrompt;
    return [
      ...input.images.map((image) => ({
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: image.mediaType, data: image.base64 },
      })),
      { type: 'text' as const, text: input.userPrompt },
    ];
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
