import { useTheme } from '@emotion/react';
import { motion, useReducedMotion } from 'framer-motion';
import type { StatusTone } from '../types/status-tone';
import { tonePalette } from '../types/tone-palette';

/** One connection on the board, as an SVG path. A `live` edge shows its flow moving. */
export interface FlowEdgeProps {
  readonly path: string;
  readonly tone: StatusTone;
}

const FLOW_DASH = '4 10';
const FLOW_DURATION_S = 1.1;
const PULSE_DURATION_S = 1.8;

/** A rounded connector. It must sit inside an `<svg>`, such as the one `BoardCanvas` draws. */
export function FlowEdge({ path, tone }: FlowEdgeProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const palette = tonePalette(theme, tone);
  const live = tone === 'live';
  const broken = tone === 'failed' || tone === 'muted';
  const stroke = live || tone === 'failed' ? palette.fg : tone === 'waiting' || tone === 'muted' ? theme.color.borderStrong : 'rgba(255, 255, 255, 0.22)';
  return (
    <g>
      <motion.path
        initial={{ d: path, pathLength: 0, opacity: 0 }}
        animate={{ d: path, pathLength: 1, opacity: live ? 0.45 : 1 }}
        transition={{ ...theme.motion.spring, pathLength: { duration: 0.6, ease: 'easeOut' } }}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeDasharray={broken ? '4 5' : undefined}
        strokeLinecap="round"
      />
      {live && !reduceMotion && (
        <>
          <motion.path
            animate={{ d: path, strokeDashoffset: [14, 0] }}
            transition={{ d: theme.motion.spring, strokeDashoffset: { duration: FLOW_DURATION_S, ease: 'linear', repeat: Infinity } }}
            fill="none"
            stroke={palette.fg}
            strokeWidth={1.75}
            strokeDasharray={FLOW_DASH}
            strokeLinecap="round"
          />
          <circle r={3} fill={palette.fg} style={{ filter: `drop-shadow(0 0 4px ${palette.fg})` }}>
            <animateMotion dur={`${PULSE_DURATION_S}s`} repeatCount="indefinite" path={path} />
          </circle>
        </>
      )}
    </g>
  );
}
