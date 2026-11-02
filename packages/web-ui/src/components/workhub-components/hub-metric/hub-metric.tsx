import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { glassSurface } from '../../../theme/glass-surface';

/** One count at the top of WorkHub, such as "3 running". A `live` metric glows green while its value is above zero. */
export interface HubMetricProps {
  readonly label: string;
  readonly value: number;
  readonly hint: string;
  readonly icon: LucideIcon;
  readonly tone?: 'live' | 'neutral';
}

const Tile = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1)};
  min-width: 0;
  padding: ${({ theme }) => `${theme.space(4)} ${theme.space(5)}`};
  border-radius: ${({ theme }) => theme.radius.lg};
  ${({ theme }) => glassSurface(theme, 'raised')};
  & > * {
    position: relative;
  }
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Label = styled.span`
  color: ${({ theme }) => theme.color.textMuted};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10.5px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Glyph = styled.span<{ glyphColor: string }>`
  display: grid;
  place-items: center;
  color: ${({ glyphColor }) => glyphColor};
`;

const Value = styled(motion.span)<{ valueColor: string }>`
  color: ${({ valueColor }) => valueColor};
  font-size: 28px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  letter-spacing: -0.03em;
`;

const Hint = styled.span`
  overflow: hidden;
  color: ${({ theme }) => theme.color.textFaint};
  font-size: ${({ theme }) => theme.font.size.xs};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/** A glass tile with a label, a large number, and a short line under it. */
export function HubMetric({ label, value, hint, icon: Icon, tone = 'neutral' }: HubMetricProps) {
  const theme = useTheme();
  const isLit = tone === 'live' && value > 0;
  return (
    <Tile>
      <Top>
        <Label>{label}</Label>
        <Glyph glyphColor={isLit ? theme.color.live : theme.color.textFaint}>
          <Icon size={15} strokeWidth={2} aria-hidden />
        </Glyph>
      </Top>
      <Value
        key={value}
        valueColor={isLit ? theme.color.live : theme.color.text}
        initial={{ opacity: 0.4, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={theme.motion.spring}
      >
        {value}
      </Value>
      <Hint title={hint}>{hint}</Hint>
    </Tile>
  );
}
