import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import type { StatusTone } from '../types/status-tone';
import { tonePalette } from '../types/tone-palette';

/** A short label centred on a point of an edge, such as "now" or "next". */
export interface EdgeLabelProps {
  readonly label: string;
  readonly tone: StatusTone;
  readonly x: number;
  readonly y: number;
}

type Palette = ReturnType<typeof tonePalette>;

const Anchor = styled(motion.span)`
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
`;

const Chip = styled.span<{ palette: Palette }>`
  position: absolute;
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: #0c0d0e;
  box-shadow: inset 0 0 0 1px ${({ palette }) => palette.border};
  color: ${({ palette }) => palette.fg};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  white-space: nowrap;
  transform: translate(-50%, -50%);
`;

/** A small mono chip that sits on an edge. */
export function EdgeLabel({ label, tone, x, y }: EdgeLabelProps) {
  const theme = useTheme();
  return (
    <Anchor initial={{ opacity: 0, x, y }} animate={{ opacity: 1, x, y }} transition={theme.motion.spring}>
      <Chip palette={tonePalette(theme, tone)}>{label}</Chip>
    </Anchor>
  );
}
