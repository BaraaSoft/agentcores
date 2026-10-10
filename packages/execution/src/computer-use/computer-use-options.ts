import type { Size } from '../driver/types/size';

/**
 * Tuning for the computer-use loop.
 */
export interface ComputerUseOptions {
  /** A model that supports `computer_toolset_20260801`, e.g. `claude-sonnet-5-5` or `claude-haiku-5-5`. */
  readonly modelId: string;
  /** Output token cap per model turn. */
  readonly maxTokens: number;
  /**
   * Largest screenshot sent to the model. The display is scaled down to fit, keeping its aspect ratio.
   * Anthropic recommends about 1280×800 for web apps; staying under 2000px per side keeps long runs within image limits.
   */
  readonly maxScreenshotSize: Size;
  /** Pause after each input action so the UI can update before the next screenshot. */
  readonly settleDelayMs: number;
}
