import { useTheme } from '@emotion/react';
import { useId } from 'react';

export interface LogoMarkProps {
  readonly size?: number;
}

const DEFAULT_SIZE = 40;

/** The AgentCores.AI mark: stacked layers for the levels of work, on a Meta blue tile. */
export function LogoMark({ size = DEFAULT_SIZE }: LogoMarkProps) {
  const theme = useTheme();
  const id = useId();
  const tile = `${id}-tile`;
  const sheen = `${id}-sheen`;
  const lift = `${id}-lift`;

  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" role="img" aria-label="AgentCores.AI">
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={theme.color.accentStrong} />
          <stop offset="1" stopColor={theme.color.accent} />
        </linearGradient>
        <linearGradient id={sheen} x1="0" y1="0" x2="0" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id={lift} x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#002A6B" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect width="512" height="512" rx="136" fill={`url(#${tile})`} />
      <rect width="512" height="512" rx="136" fill={`url(#${sheen})`} />
      <rect x="4" y="4" width="504" height="504" rx="132" stroke="#FFFFFF" strokeOpacity="0.16" strokeWidth="8" />
      <g filter={`url(#${lift})`} stroke="#FFFFFF" strokeWidth="44" strokeLinejoin="miter" strokeMiterlimit="1.6">
        <path d="M96 181 256 101 416 181 256 261Z" />
        <path d="M96 256 256 336 416 256" />
        <path d="M96 331 256 411 416 331" />
      </g>
    </svg>
  );
}
