import { runCommand } from './run-command';

/**
 * Plain-text clipboard access through the built-in `pbcopy` / `pbpaste` tools.
 */
export class MacosClipboard {
  /** Current clipboard text; empty when the clipboard holds no text. */
  async read(): Promise<string> {
    return (await runCommand('pbpaste', [])).toString('utf8');
  }

  /** Replaces the clipboard with `text`. */
  async write(text: string): Promise<void> {
    await runCommand('pbcopy', [], text);
  }
}
