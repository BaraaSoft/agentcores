import type { MessageParam, Tool, ToolResultBlockParam, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';
import type { ReasoningProvider } from './providers/reasoning-provider';
import { ReasoningToolError } from './reasoning-tool.error';
import { strictJsonSchema } from './strict-json-schema';
import type { CompletionInput } from './types/completion-input';
import type { ReasoningModelSettings } from './types/reasoning-model-settings';
import type { ReasoningTool } from './types/reasoning-tool';
import type { ToolLoopInput } from './types/tool-loop-input';

/** How many times a call that searches the web may hand the turn back unfinished before we give up. */
const MAX_PAUSED_TURNS = 5;

/**
 * Thin wrapper around the Messages API for a reasoning model, with adaptive thinking. Calls are text,
 * except that Job review, Job planning, and the evaluator may attach a visual Task's final screenshot. The reasoning
 * provider (Claude or Muse) supplies the endpoint and the server tools; the calls are the same for both. Strategy
 * reasoning and the evaluator use this class; Job and Task get a subclass (`JobReasoningModelClient`,
 * `TaskReasoningModelClient`). `ReasoningModule` builds each one from config.
 */
export class ReasoningModelClient {
  constructor(
    private readonly reasoningProvider: ReasoningProvider,
    private readonly settings: ReasoningModelSettings,
  ) {}

  /** Whether calls on this client can read pages (web fetch), so a prompt can ask for it only when it works. */
  get canFetch(): boolean {
    return this.reasoningProvider.canFetch;
  }

  /**
   * Sends one prompt and returns the reply parsed against `input.schema`. The schema is sent as the
   * output format, so the model can think first and still must answer in that shape. With
   * `input.webSearch` or `input.webFetch` it may also search or read pages before answering, as far as the
   * reasoning provider offers those tools; the API runs them itself, which is why no tool has to be executed
   * here. Throws when the reply is cut off, refused, or doesn't match.
   */
  async completeStructured<TOutput>(input: CompletionInput<TOutput>): Promise<TOutput> {
    const schema = strictJsonSchema(input.schema);
    const tools = this.reasoningProvider.serverTools(input);
    const messages: MessageParam[] = [{ role: 'user', content: this.userContent(input) }];

    for (let pause = 0; pause <= MAX_PAUSED_TURNS; pause++) {
      const message = await this.reasoningProvider.sdk.messages.create({
        model: this.settings.modelId,
        max_tokens: input.maxTokens,
        system: input.systemPrompt,
        messages,
        thinking: { type: 'adaptive' },
        output_config: { effort: this.settings.effort, format: { type: 'json_schema', schema } },
        tools,
      });
      // Searching can run long enough that the API hands the turn back unfinished. Returning its own
      // work lets it pick up where it stopped instead of starting the judgement again.
      if (message.stop_reason === 'pause_turn') {
        messages.push({ role: 'assistant', content: message.content });
        continue;
      }
      const answer = message.content.filter((block) => block.type === 'text').at(-1);
      if (message.stop_reason !== 'end_turn' || answer === undefined) {
        throw new Error(`Reasoning model gave no structured answer (stop reason: ${message.stop_reason ?? 'unknown'})`);
      }
      // Some models (Muse) narrate in text blocks between searches; only the last text block is the answer.
      return input.schema.parse(JSON.parse(answer.text));
    }
    throw new Error(`Reasoning model paused more than ${MAX_PAUSED_TURNS} times without answering`);
  }

  /** The prompt alone, or the images first and the prompt after them, which is how the model reads images best. */
  private userContent(input: Pick<CompletionInput<unknown>, 'userPrompt' | 'images'>): MessageParam['content'] {
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
    const messages: MessageParam[] = [{ role: 'user', content: this.userContent(input) }];

    for (let turn = 0; turn < input.maxTurns; turn++) {
      const message = await this.reasoningProvider.sdk.messages.create({
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
      input_schema: strictJsonSchema(tool.inputSchema) as Tool['input_schema'],
      strict: true,
    };
  }
}
