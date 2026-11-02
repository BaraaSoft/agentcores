import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { glassSurface } from '../../../theme/glass-surface';
import { LaunchStepRow } from './launch-step-row';
import type { LaunchStepStatus } from './launch-step-status';

/** One step shown in the panel. */
export interface LaunchPanelStep {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly status: LaunchStepStatus;
  readonly error: string | null;
}

/** The side panel of the form: a summary of what will launch, the launch steps with their progress, and the actions. */
export interface LaunchPanelProps {
  readonly title: string;
  readonly summary: readonly { readonly label: string; readonly value: string }[];
  readonly steps: readonly LaunchPanelStep[];
  /** How far the launch is, from 0 to 1. */
  readonly progress: number;
  readonly actions: ReactNode;
  readonly footnote?: string;
}

const Panel = styled.aside`
  position: sticky;
  top: ${({ theme }) => `calc(${theme.layout.headerHeight} + ${theme.space(6)})`};
  z-index: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.lg};
  ${({ theme }) => glassSurface(theme, 'raised')};
  & > * {
    position: relative;
  }
`;

const Track = styled.div`
  height: 3px;
  background: rgba(255, 255, 255, 0.05);
`;

const Fill = styled(motion.div)`
  height: 100%;
  transform-origin: left;
  background: linear-gradient(90deg, ${({ theme }) => theme.color.accent}, ${({ theme }) => theme.color.live});
  box-shadow: 0 0 12px ${({ theme }) => theme.color.accent};
`;

const Block = styled.div`
  padding: ${({ theme }) => `${theme.space(5)} ${theme.space(6)}`};
  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.border};
  }
`;

const Heading = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.textMuted};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Summary = styled.dl`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: ${({ theme }) => `${theme.space(2.5)} ${theme.space(4)}`};
  margin: 0;
`;

const Term = styled.dt`
  color: ${({ theme }) => theme.color.textFaint};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

const Value = styled.dd`
  margin: 0;
  overflow: hidden;
  color: ${({ theme }) => theme.color.text};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Steps = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2.5)};
`;

const Footnote = styled.p`
  margin: ${({ theme }) => theme.space(3)} 0 0;
  color: ${({ theme }) => theme.color.textFaint};
  font-size: ${({ theme }) => theme.font.size.xs};
  line-height: 1.5;
  text-align: center;
`;

/** A sticky glass card with a thin progress line on top that fills from blue to green as the steps finish. */
export function LaunchPanel({ title, summary, steps, progress, actions, footnote }: LaunchPanelProps) {
  const theme = useTheme();
  return (
    <Panel aria-label={title}>
      <Track aria-hidden>
        <Fill initial={false} animate={{ scaleX: Math.min(1, Math.max(0, progress)) }} transition={theme.motion.spring} />
      </Track>
      <Block>
        <Heading>{title}</Heading>
        <Summary>
          {summary.map((row) => (
            <div key={row.label} style={{ display: 'contents' }}>
              <Term>{row.label}</Term>
              <Value title={row.value}>{row.value}</Value>
            </div>
          ))}
        </Summary>
      </Block>
      <Block>
        <Heading>Launch steps</Heading>
        <Steps>
          {steps.map((step, index) => (
            <LaunchStepRow
              key={step.id}
              number={index + 1}
              label={step.label}
              detail={step.detail}
              status={step.status}
              error={step.error}
              isLast={index === steps.length - 1}
            />
          ))}
        </Steps>
      </Block>
      <Block>
        <Actions>{actions}</Actions>
        {footnote !== undefined && <Footnote>{footnote}</Footnote>}
      </Block>
    </Panel>
  );
}
