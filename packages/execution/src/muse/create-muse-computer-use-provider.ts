import Anthropic from '@anthropic-ai/sdk';
import { PermissiveActionGuard } from '../actions/permissive-action-guard';
import type { ComputerUseProviderOptions } from '../computer-use-provider-options';
import { MacosDesktopDriver } from '../driver/macos/macos-desktop-driver';
import { TaskReportParser } from '../task-report/task-report-parser';
import { MuseComputerUseProvider } from './muse-computer-use.provider';

/** Meta's Anthropic-compatible endpoint; the SDK appends `/v1/messages`. */
const MUSE_BASE_URL = 'https://api.meta.ai';

/**
 * Builds a MuseComputerUseProvider wired to the real Mac display and input, with `apiKey` as the Meta API key.
 * `apiKey: null` on the SDK stops it from also sending `ANTHROPIC_API_KEY` from the environment to Meta.
 */
export function createMuseComputerUseProvider(options: ComputerUseProviderOptions): MuseComputerUseProvider {
  return new MuseComputerUseProvider(
    {
      client: new Anthropic({ baseURL: MUSE_BASE_URL, authToken: options.apiKey, apiKey: null }),
      desktop: new MacosDesktopDriver(),
      guard: options.guard ?? new PermissiveActionGuard(),
      reportParser: new TaskReportParser(),
    },
    {
      modelId: options.modelId,
      maxTokens: options.maxTokens ?? 4096,
      maxScreenshotSize: { width: options.maxScreenshotWidth ?? 1280, height: options.maxScreenshotHeight ?? 800 },
      settleDelayMs: options.settleDelayMs ?? 300,
      onTurn: options.onTurn ?? null,
    },
  );
}
