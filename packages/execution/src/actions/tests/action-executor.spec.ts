import { DisplayGeometry } from '../../geometry/display-geometry';
import { FakeDesktopDriver } from '../../driver/testing/fake-desktop-driver';
import { ActionExecutor } from '../action-executor';
import { ActionRefusedError } from '../action-refused.error';

describe('ActionExecutor', () => {
  let desktop: FakeDesktopDriver;
  let executor: ActionExecutor;

  beforeEach(() => {
    desktop = new FakeDesktopDriver({ width: 1440, height: 900 });
    executor = new ActionExecutor(desktop, DisplayGeometry.fit({ width: 1440, height: 900 }, { width: 1280, height: 800 }), 0);
  });

  it('resizes every screenshot to the fixed screenshot size', async () => {
    const outcome = await executor.perform({ kind: 'screenshot' });
    expect(outcome.kind).toBe('image');
    expect(desktop.calls).toEqual(['capture', 'resize 1280x800']);
  });

  it('zooms by capturing the display region and fitting it to the screenshot size', async () => {
    await executor.perform({ kind: 'zoom', from: { x: 0, y: 0 }, to: { x: 640, y: 400 } });
    expect(desktop.calls).toEqual(['capture 0,0 720x450', 'scaleToFit 1280x800']);
  });

  it('scales the click point and holds modifiers around the click', async () => {
    await executor.perform({ kind: 'click', at: { x: 640, y: 400 }, button: 'left', clickCount: 1, modifiers: 'cmd+shift' });
    expect(desktop.calls).toEqual([
      'moveTo 720,450',
      'keyDown meta',
      'keyDown shift',
      'click left x1',
      'keyUp shift',
      'keyUp meta',
    ]);
  });

  it('clicks at the cursor when no point is given', async () => {
    await executor.perform({ kind: 'click', at: null, button: 'right', clickCount: 1, modifiers: null });
    expect(desktop.calls).toEqual(['click right x1']);
  });

  it('refuses a click count the pointer driver cannot send', async () => {
    await expect(
      executor.perform({ kind: 'click', at: null, button: 'left', clickCount: 3, modifiers: null }),
    ).rejects.toThrow(ActionRefusedError);
    expect(desktop.calls).toEqual([]);
  });

  it('refuses points outside the screenshot instead of clamping them', async () => {
    await expect(executor.perform({ kind: 'mouseMove', to: { x: 1280, y: 10 } })).rejects.toThrow(
      /outside the 1280x800 screenshot/,
    );
    expect(desktop.calls).toEqual([]);
  });

  it('drags by pressing, moving, and releasing the left button', async () => {
    await executor.perform({ kind: 'drag', from: { x: 0, y: 0 }, to: { x: 640, y: 400 }, modifiers: null });
    expect(desktop.calls).toEqual(['moveTo 0,0', 'press left', 'moveTo 720,450', 'release left']);
  });

  it('scrolls at a point with a bounded amount', async () => {
    await executor.perform({ kind: 'scroll', at: { x: 640, y: 400 }, direction: 'down', amount: 3, modifiers: null });
    expect(desktop.calls).toEqual(['moveTo 720,450', 'scroll down 3']);
    await expect(
      executor.perform({ kind: 'scroll', at: null, direction: 'down', amount: 500, modifiers: null }),
    ).rejects.toThrow(ActionRefusedError);
  });

  it('presses a key combination `repeat` times', async () => {
    await executor.perform({ kind: 'key', combo: 'ctrl+z', repeat: 3 });
    expect(desktop.calls).toEqual(['tap control+z', 'tap control+z', 'tap control+z']);
  });

  it('holds a key combination and releases it in reverse order', async () => {
    await executor.perform({ kind: 'holdKey', combo: 'shift+a', milliseconds: 1 });
    expect(desktop.calls).toEqual(['keyDown shift', 'keyDown a', 'keyUp a', 'keyUp shift']);
  });

  it('reports the cursor position in screenshot pixels', async () => {
    desktop.cursor = { x: 720, y: 450 };
    expect(await executor.perform({ kind: 'cursorPosition' })).toEqual({ kind: 'cursor', position: { x: 640, y: 400 } });
  });

  it('refuses waits longer than the limit', async () => {
    await expect(executor.perform({ kind: 'wait', milliseconds: 10 * 60_000 })).rejects.toThrow(ActionRefusedError);
  });
});
