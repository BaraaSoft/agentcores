import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import type { StatusTone } from '../types/status-tone';
import { tonePalette } from '../types/tone-palette';

/** How much of a card's work is finished. */
export interface CardProgressProps {
  readonly done: number;
  readonly total: number;
  readonly tone: StatusTone;
}

const Track = styled.span`
  position: absolute;
  right: 14px;
  bottom: 0;
  left: 14px;
  height: 2px;
  overflow: hidden;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.06);
`;

const Fill = styled(motion.span)<{ barColor: string }>`
  display: block;
  height: 100%;
  border-radius: 2px;
  background: ${({ barColor }) => barColor};
  box-shadow: 0 0 8px ${({ barColor }) => barColor};
`;

/** A hairline bar on the bottom edge of a card that grows as the work finishes. */
export function CardProgress({ done, total, tone }: CardProgressProps) {
  const theme = useTheme();
  const color = tone === 'live' || tone === 'failed' || tone === 'judging' ? tonePalette(theme, tone).fg : theme.color.textMuted;
  return (
    <Track aria-hidden>
      <Fill barColor={color} initial={{ width: 0 }} animate={{ width: `${(done / total) * 100}%` }} transition={theme.motion.spring} />
    </Track>
  );
}
