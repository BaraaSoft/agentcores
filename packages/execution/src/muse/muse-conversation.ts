import type Anthropic from '@anthropic-ai/sdk';

type MessageParam = Anthropic.Messages.MessageParam;
type ToolResultBlockParam = Anthropic.Messages.ToolResultBlockParam;

/** Screenshots older than the newest few are replaced by this text. */
const REMOVED_SCREENSHOT = 'An earlier screenshot, removed to save space.';

/**
 * The message history of one Muse task. Every turn adds a screenshot, so only the newest `keptScreenshots`
 * images stay; older ones become a short text. The model acts on the latest screen, and a long task stays
 * inside the context window.
 */
export class MuseConversation {
  private readonly history: MessageParam[];

  constructor(
    taskPrompt: string,
    private readonly keptScreenshots: number,
  ) {
    this.history = [{ role: 'user', content: taskPrompt }];
  }

  /** The messages to send with the next request. */
  get messages(): readonly MessageParam[] {
    return this.history;
  }

  /** Adds the model's turn exactly as it came back, thinking blocks included. */
  addModelTurn(content: Anthropic.Messages.ContentBlock[]): void {
    this.history.push({ role: 'assistant', content: content as Anthropic.Messages.ContentBlockParam[] });
  }

  /** Answers every tool call of the last turn, with an optional note after them, then drops screenshots past the newest few. */
  addToolResults(results: readonly ToolResultBlockParam[], note?: string): void {
    this.history.push({ role: 'user', content: note === undefined ? [...results] : [...results, { type: 'text', text: note }] });
    this.dropOldScreenshots();
  }

  addUserText(text: string): void {
    this.history.push({ role: 'user', content: text });
  }

  /** Replaces the oldest images, in the order they were taken, until only the newest few are left. */
  private dropOldScreenshots(): void {
    const results = this.history.flatMap((message) => (typeof message.content === 'string' ? [] : message.content)).filter(isToolResult);
    const imageCount = results.reduce((count, result) => count + imagesIn(result), 0);
    let toDrop = imageCount - this.keptScreenshots;
    for (const result of results) {
      if (toDrop <= 0 || !Array.isArray(result.content)) continue;
      result.content = result.content.map((part) => {
        if (part.type !== 'image' || toDrop <= 0) return part;
        toDrop -= 1;
        return { type: 'text', text: REMOVED_SCREENSHOT };
      });
    }
  }
}

function isToolResult(block: Anthropic.Messages.ContentBlockParam): block is ToolResultBlockParam {
  return block.type === 'tool_result';
}

function imagesIn(result: ToolResultBlockParam): number {
  return Array.isArray(result.content) ? result.content.filter((part) => part.type === 'image').length : 0;
}
