import Anthropic from '@anthropic-ai/sdk';
import { PermissiveActionGuard } from './actions/permissive-action-guard';
import { MacosDesktopDriver } from './driver/macos/macos-desktop-driver';
import { TaskReportParser } from './task-report/task-report-parser';
import { ComputerUseProvider } from './computer-use/computer-use.provider';
import type { ComputerUseProviderOptions } from './computer-use-provider-options';

/**
 * Builds a ComputerUseProvider wired to the real Mac display and input.
 * This is the single entry point the backend uses to get an ExecutionProvider.
 */
export function createComputerUseProvider(options: ComputerUseProviderOptions): ComputerUseProvider {
  return new ComputerUseProvider(
    {
      client: new Anthropic({ apiKey: options.apiKey }),
      desktop: new MacosDesktopDriver(),
      guard: options.guard ?? new PermissiveActionGuard(),
      reportParser: new TaskReportParser(),
    },
    {
      modelId: options.modelId,
      maxTokens: options.maxTokens ?? 4096,
      maxScreenshotSize: { width: options.maxScreenshotWidth ?? 1280, height: options.maxScreenshotHeight ?? 800 },
      settleDelayMs: options.settleDelayMs ?? 300,
    },
  );
}
