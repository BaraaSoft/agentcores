import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import type { StatusTone } from '../types/status-tone';
import { tonePalette } from '../types/tone-palette';

/** One figure in the strip, such as "Tasks done · 4/9". */
interface StatItem {
  readonly label: string;
  readonly value: string;
  readonly tone?: StatusTone;
}

/** The figures to show, left to right. The first one is the widest, for the Strategy. */
export interface StatStripProps {
  readonly items: readonly StatItem[];
}

const Strip = styled.div`
  display: grid;
  grid-template-columns: minmax(220px, 2fr) repeat(auto-fit, minmax(120px, 1fr));
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => `${theme.space(5)} ${theme.space(7)} 0`};
`;

const Tile = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(4)}`};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
`;

const Label = styled.span`
  color: ${({ theme }) => theme.color.textMuted};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Value = styled.span<{ valueColor: string }>`
  overflow: hidden;
  color: ${({ valueColor }) => valueColor};
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: -0.015em;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;

/** A row of small glossy tiles with the key figures of the work. */
export function StatStrip({ items }: StatStripProps) {
  const theme = useTheme();
  return (
    <Strip>
      {items.map((item, index) => (
        <Tile
          key={item.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...theme.motion.spring, delay: index * 0.04 }}
        >
          <Label>{item.label}</Label>
          <Value valueColor={item.tone === undefined ? theme.color.text : tonePalette(theme, item.tone).fg} title={item.value}>
            {item.value}
          </Value>
        </Tile>
      ))}
    </Strip>
  );
}
