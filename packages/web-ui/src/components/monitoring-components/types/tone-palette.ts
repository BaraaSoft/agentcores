import type { Theme } from '@emotion/react';
import type { StatusTone } from './status-tone';

/** The colours of one tone: the text and line colour, a soft fill, and a border. */
interface TonePalette {
  readonly fg: string;
  readonly bg: string;
  readonly border: string;
}

/** Maps a status tone to its colours from the theme. */
export function tonePalette(theme: Theme, tone: StatusTone): Readonly<TonePalette> {
  const { color } = theme;
  const palettes: Record<StatusTone, TonePalette> = {
    live: { fg: color.live, bg: color.liveSoft, border: 'rgba(76, 183, 130, 0.45)' },
    done: { fg: color.text, bg: 'rgba(255, 255, 255, 0.06)', border: 'rgba(255, 255, 255, 0.14)' },
    failed: { fg: color.danger, bg: color.dangerSoft, border: 'rgba(235, 87, 87, 0.42)' },
    judging: { fg: color.warning, bg: color.warningSoft, border: 'rgba(233, 180, 76, 0.4)' },
    scored: { fg: color.accentText, bg: color.accentSoft, border: 'rgba(0, 129, 251, 0.45)' },
    waiting: { fg: color.textMuted, bg: 'rgba(255, 255, 255, 0.03)', border: color.borderStrong },
    muted: { fg: color.textFaint, bg: 'transparent', border: color.border },
  };
  return palettes[tone];
}
