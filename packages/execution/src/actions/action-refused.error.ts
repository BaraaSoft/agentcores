/**
 * Thrown when a ToolCall can't or shouldn't run as given — a point off the screen,
 * an unknown key, a wait that is too long. The message is written for the model:
 * it is shown to it verbatim so it can send a corrected call.
 */
export class ActionRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActionRefusedError';
  }
}
