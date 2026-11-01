import { useTheme } from '@emotion/react';
import { motion } from 'framer-motion';

/** The score to show, out of `max`. Null shows an empty gauge. */
export interface ScoreMeterProps {
  readonly value: number | null;
  readonly max: number;
}

const WIDTH = 52;
const HEIGHT = 30;
const RADIUS = 21;
const STROKE = 5;
const GAP = 0.07;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT - 3;

/** A point on the gauge's arc, where 0 is the far left and π is the far right. */
function pointAt(angle: number): string {
  return `${CENTER_X - RADIUS * Math.cos(angle)} ${CENTER_Y - RADIUS * Math.sin(angle)}`;
}

/** The arc path of one segment of the gauge. */
function segmentPath(index: number, count: number): string {
  const step = Math.PI / count;
  return `M ${pointAt(index * step + GAP)} A ${RADIUS} ${RADIUS} 0 0 1 ${pointAt((index + 1) * step - GAP)}`;
}

/** A half-dial of one segment per point; the segments light up in Meta blue up to the score. */
export function ScoreMeter({ value, max }: ScoreMeterProps) {
  const theme = useTheme();
  const lit = value === null ? 0 : Math.round(value);
  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden>
      {Array.from({ length: max }, (_, index) => {
        const isLit = index < lit;
        const isTip = index === lit - 1;
        return (
          <motion.path
            key={index}
            d={segmentPath(index, max)}
            fill="none"
            strokeWidth={STROKE}
            initial={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
            animate={{ stroke: isTip ? theme.color.accentText : isLit ? theme.color.accent : 'rgba(255, 255, 255, 0.08)' }}
            transition={{ ...theme.motion.fast, delay: index * 0.04 }}
            style={isLit ? { filter: `drop-shadow(0 0 ${isTip ? 5 : 3}px ${theme.color.accentSoft})` } : undefined}
          />
        );
      })}
    </svg>
  );
}
