import { useTheme } from '@emotion/react';

/** The size of the mark in pixels. */
export interface LogoMarkProps {
  readonly size?: number;
}

const DEFAULT_SIZE = 28;
const INK = '#FFFFFF';

/** The AHE mark: three stacked layers, for Strategy, Jobs, and Tasks, on a Meta blue tile. */
export function LogoMark({ size = DEFAULT_SIZE }: LogoMarkProps) {
  const theme = useTheme();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="AHE">
      <defs>
        <linearGradient id="logo-mark-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={theme.color.accentStrong} />
          <stop offset="1" stopColor={theme.color.accent} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#logo-mark-fill)" />
      <path d="M7 15.5 12 18l5-2.5" fill="none" stroke={INK} strokeOpacity="0.45" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 12 12 14.5 17 12" fill="none" stroke={INK} strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6 17 8.5 12 11 7 8.5Z" fill={INK} />
    </svg>
  );
}
