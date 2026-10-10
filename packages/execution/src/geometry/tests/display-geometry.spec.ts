import { DisplayGeometry } from '../display-geometry';

describe('DisplayGeometry', () => {
  const macbookDisplay = { width: 1440, height: 900 };
  const maxScreenshot = { width: 1280, height: 800 };

  it('scales the display down to fit, keeping the aspect ratio', () => {
    const geometry = DisplayGeometry.fit({ width: 1920, height: 1080 }, maxScreenshot);
    expect(geometry.screenshotSize).toEqual({ width: 1280, height: 720 });
  });

  it('never scales a small display up', () => {
    const geometry = DisplayGeometry.fit({ width: 1024, height: 768 }, maxScreenshot);
    expect(geometry.screenshotSize).toEqual({ width: 1024, height: 768 });
  });

  it('converts model points to display points and back', () => {
    const geometry = DisplayGeometry.fit(macbookDisplay, maxScreenshot);
    expect(geometry.screenshotSize).toEqual({ width: 1280, height: 800 });
    expect(geometry.toDisplay({ x: 640, y: 400 })).toEqual({ x: 720, y: 450 });
    expect(geometry.toScreenshot({ x: 720, y: 450 })).toEqual({ x: 640, y: 400 });
  });

  it('keeps reported cursor positions on the screenshot', () => {
    const geometry = DisplayGeometry.fit(macbookDisplay, maxScreenshot);
    expect(geometry.toScreenshot({ x: 1440, y: 900 })).toEqual({ x: 1279, y: 799 });
    expect(geometry.toScreenshot({ x: -5, y: -5 })).toEqual({ x: 0, y: 0 });
  });

  it('only accepts points that lie on the screenshot', () => {
    const geometry = DisplayGeometry.fit(macbookDisplay, maxScreenshot);
    expect(geometry.isInsideScreenshot({ x: 0, y: 0 })).toBe(true);
    expect(geometry.isInsideScreenshot({ x: 1279, y: 799 })).toBe(true);
    expect(geometry.isInsideScreenshot({ x: 1280, y: 10 })).toBe(false);
    expect(geometry.isInsideScreenshot({ x: -1, y: 10 })).toBe(false);
    expect(geometry.isInsideScreenshot({ x: Number.NaN, y: 10 })).toBe(false);
  });

  it('turns zoom corners in any order into a display region', () => {
    const geometry = DisplayGeometry.fit(macbookDisplay, maxScreenshot);
    expect(geometry.regionToDisplay({ x: 640, y: 400 }, { x: 0, y: 0 })).toEqual({ x: 0, y: 0, width: 720, height: 450 });
  });
});
