import pc from 'picocolors';

export type BoxTone = 'error' | 'success' | 'info';

const BLUE = (text: string): string => (pc.isColorSupported ? `\x1b[38;2;0;129;251m${text}\x1b[39m` : text);
const TONES: Record<BoxTone, { paint: (text: string) => string; mark: string }> = {
  error: { paint: pc.red, mark: '✖' },
  success: { paint: pc.green, mark: '🐙 ✔' },
  info: { paint: BLUE, mark: '●' },
};

const ANSI = /\x1b\[[0-9;]*m/g;

export function visibleWidth(text: string): number {
  return [...text.replace(ANSI, '')].length;
}

/** A rounded box with a bold title line, for the messages the user must not miss. */
export function box(tone: BoxTone, title: string, lines: readonly string[]): string {
  const { paint, mark } = TONES[tone];
  const heading = pc.bold(paint(`${mark}  ${title}`));
  const body = ['', heading, '', ...lines, ''];
  const textWidth = Math.max(...body.map(visibleWidth));
  const rule = '─'.repeat(textWidth + 6);
  const row = (text: string): string => `${paint('│')}   ${text}${' '.repeat(textWidth - visibleWidth(text))}   ${paint('│')}`;
  return [paint(`╭${rule}╮`), ...body.map(row), paint(`╰${rule}╯`)].join('\n');
}

/** A command the user should type, so it stands out inside a box. */
export function command(text: string): string {
  return pc.bold(pc.cyan(text));
}

export function link(url: string): string {
  return pc.underline(BLUE(url));
}

export const brand = (): string => pc.bold(BLUE('AgentCores.AI'));

/** An expected failure with a message for the user. The entry point prints it as a red box and exits with 1. */
export class CliError extends Error {
  constructor(
    readonly title: string,
    readonly lines: readonly string[],
  ) {
    super(title);
  }
}
