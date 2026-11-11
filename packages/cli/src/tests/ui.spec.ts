import pc from 'picocolors';
import { box, command, visibleWidth } from '../ui';

describe('box', () => {
  it('gives every line the same width, with colors in the text', () => {
    const lines = box('error', 'Docker is not running', ['short', `Run ${command('npx agentcores init')} again.`, '']).split('\n');

    const widths = new Set(lines.map(visibleWidth));

    expect(widths.size).toBe(1);
  });

  it('puts the title on the second line of text', () => {
    const text = box('success', 'Ready', ['body']);

    expect(text.split('\n')[2]).toContain('Ready');
  });
});

describe('visibleWidth', () => {
  it('ignores the color codes', () => {
    expect(visibleWidth(pc.red('abc'))).toBe(3);
  });
});
