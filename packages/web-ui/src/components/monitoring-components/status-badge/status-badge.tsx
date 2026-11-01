import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { StatusTone } from '../types/status-tone';
import { tonePalette } from '../types/tone-palette';

/** A small status chip, such as RUNNING or SCORE 8. A `live` badge shows a pulsing dot, a `done` badge a green tick. */
export interface StatusBadgeProps {
  readonly label: string;
  readonly tone: StatusTone;
}

type Palette = ReturnType<typeof tonePalette>;

const Chip = styled.span<{ palette: Palette }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 18px;
  padding: 0 7px;
  border-radius: 999px;
  background: ${({ palette }) => palette.bg};
  box-shadow: inset 0 0 0 1px ${({ palette }) => palette.border};
  color: ${({ palette }) => palette.fg};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
`;

const Dot = styled(motion.span)<{ palette: Palette }>`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ palette }) => palette.fg};
  box-shadow: 0 0 6px ${({ palette }) => palette.fg};
`;

/** Shows the status of a card in its tone colour. */
export function StatusBadge({ label, tone }: StatusBadgeProps) {
  const theme = useTheme();
  const palette = tonePalette(theme, tone);
  return (
    <Chip palette={palette}>
      {tone === 'live' && (
        <Dot palette={palette} animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />
      )}
      {label}
      {tone === 'done' && <Check size={10} strokeWidth={3} color={theme.color.live} aria-hidden />}
    </Chip>
  );
}
