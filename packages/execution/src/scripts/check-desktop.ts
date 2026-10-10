import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MacosDesktopDriver } from '../driver/macos/macos-desktop-driver';
import { DisplayGeometry } from '../geometry/display-geometry';

/**
 * One-off setup check for a new Mac: asks macOS for the Accessibility and Screen Recording
 * permissions, then takes one screenshot at the size the model will see and saves it for a visual check.
 * It sends no mouse or keyboard input.
 *
 * Usage: `pnpm --filter @ahe/execution check:desktop`
 */
async function main(): Promise<void> {
  const desktop = new MacosDesktopDriver();
  const permissions = await desktop.requestPermissions();
  console.log(`Accessibility (input): ${permissions.canControlInput ? 'granted' : 'MISSING'}`);
  console.log(`Screen Recording:      ${permissions.canCaptureScreen ? 'granted' : 'MISSING'}`);
  if (!permissions.canControlInput || !permissions.canCaptureScreen) {
    console.log('Grant the missing permissions in System Settings › Privacy & Security, then run this again.');
    process.exitCode = 1;
    return;
  }

  const geometry = DisplayGeometry.fit(await desktop.pointer.getDisplaySize(), { width: 1280, height: 800 });
  const capture = await desktop.screen.capture();
  const nativeSize = await desktop.images.getSize(capture);
  const screenshot = await desktop.images.resize(capture, geometry.screenshotSize);
  const path = join(tmpdir(), 'ahe-check-desktop.png');
  await writeFile(path, screenshot.data);

  const { displaySize, screenshotSize } = geometry;
  console.log(`Display: ${displaySize.width}x${displaySize.height} points, captured at ${nativeSize.width}x${nativeSize.height} pixels`);
  console.log(`Model sees: ${screenshotSize.width}x${screenshotSize.height} — saved to ${path}`);
}

void main();
