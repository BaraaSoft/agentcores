import { useTheme } from '@emotion/react';
import { motion } from 'framer-motion';

/** How full the ring is, from 0 to 1. */
export interface ProgressRingProps {
  readonly ratio: number;
}

const SIZE = 30;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A thin ring that fills clockwise, with a soft glow on its filled arc. */
export function ProgressRing({ ratio }: ProgressRingProps) {
  const theme = useTheme();
  const clamped = Math.min(1, Math.max(0, ratio));
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden overflow="visible">
      <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth={STROKE} />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={theme.color.text}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - clamped) }}
          transition={theme.motion.spring}
          style={{ filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.35))' }}
        />
      </g>
    </svg>
  );
}
