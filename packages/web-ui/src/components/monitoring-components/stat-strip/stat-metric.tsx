import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import type { StatusTone } from '../types/status-tone';
import { tonePalette } from '../types/tone-palette';
import { LivePulse } from './live-pulse';
import { ProgressRing } from './progress-ring';
import { ScoreMeter } from './score-meter';
import type { StatVisual } from './stat-visual';
import { StepDots } from './step-dots';

/** One figure of the strip: a big value, an optional "of N", a label, and a small picture. */
export interface StatMetricProps {
  readonly label: string;
  readonly value: string;
  readonly total?: string;
  readonly tone?: StatusTone;
  readonly visual: StatVisual;
}

const Metric = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  min-width: 0;
  padding: 0 ${({ theme }) => theme.space(5)};
  &::before {
    content: '';
    position: absolute;
    top: 18%;
    bottom: 18%;
    left: 0;
    width: 1px;
    background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.09), transparent);
  }
`;

const Text = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const Value = styled(motion.span)<{ valueColor: string }>`
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  color: ${({ valueColor }) => valueColor};
  font-size: 24px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
`;

const Total = styled.span`
  color: ${({ theme }) => theme.color.textFaint};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  letter-spacing: 0;
`;

const Label = styled.span`
  overflow: hidden;
  color: ${({ theme }) => theme.color.textMuted};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/** A metric with a large, tabular value, a mono label beneath it, and its picture on the right. */
export function StatMetric({ label, value, total, tone, visual }: StatMetricProps) {
  const theme = useTheme();
  const valueColor = tone === undefined ? theme.color.text : tonePalette(theme, tone).fg;
  return (
    <Metric>
      <Text>
        <Value key={value} valueColor={valueColor} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={theme.motion.spring}>
          {value}
          {total !== undefined && <Total>of {total}</Total>}
        </Value>
        <Label>{label}</Label>
      </Text>
      {visual.kind === 'ring' && <ProgressRing ratio={visual.ratio} />}
      {visual.kind === 'steps' && <StepDots done={visual.done} total={visual.total} currentLive={visual.currentLive} />}
      {visual.kind === 'meter' && <ScoreMeter value={visual.value} max={visual.max} />}
      {visual.kind === 'pulse' && <LivePulse active={visual.active} />}
    </Metric>
  );
}
