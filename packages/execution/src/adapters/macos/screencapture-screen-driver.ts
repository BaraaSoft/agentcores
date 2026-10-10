import { randomUUID } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ScreenDriver } from '../../driver/screen-driver';
import type { CapturedImage } from '../../driver/types/captured-image';
import type { Region } from '../../driver/types/region';
import { runCommand } from './run-command';

/**
 * ScreenDriver backed by the built-in macOS `screencapture` tool: no native addon to build,
 * and Apple keeps it working across OS releases. Each capture goes through a temp file that is deleted right after.
 *
 * Without the Screen Recording permission, macOS silently returns only the wallpaper,
 * so check permissions before trusting a capture.
 */
export class ScreencaptureScreenDriver implements ScreenDriver {
  async capture(region?: Region): Promise<CapturedImage> {
    const path = join(tmpdir(), `ahe-capture-${randomUUID()}.png`);
    const area = region === undefined ? ['-m'] : ['-R', `${region.x},${region.y},${region.width},${region.height}`];

    try {
      await runCommand('screencapture', ['-x', '-t', 'png', ...area, path]);
      return { data: await readFile(path), mediaType: 'image/png' };
    } finally {
      await rm(path, { force: true });
    }
  }
}
