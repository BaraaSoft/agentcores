import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { glassSurface } from '../../../theme/glass-surface';
import { StatHero, type StatHeroProps } from './stat-hero';
import { StatMetric, type StatMetricProps } from './stat-metric';

/** The lead block, and the metrics to its right. */
export interface StatStripProps {
  readonly hero: StatHeroProps;
  readonly metrics: readonly StatMetricProps[];
}

const Wrap = styled.div`
  padding: ${({ theme }) => `${theme.space(5)} ${theme.space(7)} 0`};
`;

const Bar = styled(motion.div)<{ metricCount: number }>`
  position: relative;
  display: grid;
  grid-template-columns: minmax(240px, 1.6fr) repeat(${({ metricCount }) => metricCount}, minmax(150px, 1fr));
  align-items: center;
  min-height: 84px;
  border-radius: ${({ theme }) => theme.radius.lg};
  ${({ theme }) => glassSurface(theme, 'raised')};
  & > * {
    position: relative;
  }
`;

/** One glossy glass bar: the Strategy on the left, then the live metrics split by soft dividers. */
export function StatStrip({ hero, metrics }: StatStripProps) {
  const theme = useTheme();
  return (
    <Wrap>
      <Bar metricCount={metrics.length} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={theme.motion.spring}>
        <StatHero {...hero} />
        {metrics.map((metric) => (
          <StatMetric key={metric.label} {...metric} />
        ))}
      </Bar>
    </Wrap>
  );
}
