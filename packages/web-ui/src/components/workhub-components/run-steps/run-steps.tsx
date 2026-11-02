import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import type { LaunchPanelStep } from '../../strategy-components/launch-panel/launch-panel';
import { LaunchStepRow } from '../../strategy-components/launch-panel/launch-step-row';

/** The steps of a fresh run of a Strategy, with how far it is. */
export interface RunStepsProps {
  readonly label: string;
  readonly steps: readonly LaunchPanelStep[];
  /** From 0 to 1. */
  readonly progress: number;
}

const Frame = styled(motion.section)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(4)};
`;

const Track = styled.div`
  height: 3px;
  overflow: hidden;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.06);
`;

const Fill = styled(motion.div)`
  height: 100%;
  transform-origin: left;
  background: linear-gradient(90deg, ${({ theme }) => theme.color.accent}, ${({ theme }) => theme.color.live});
  box-shadow: 0 0 12px ${({ theme }) => theme.color.accent};
`;

const Steps = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
`;

/** A thin line that fills from blue to green, over the numbered steps that the launch panel uses. */
export function RunSteps({ label, steps, progress }: RunStepsProps) {
  const theme = useTheme();
  return (
    <Frame
      aria-label={label}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={theme.motion.spring}
    >
      <Track role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <Fill initial={false} animate={{ scaleX: Math.min(1, Math.max(0, progress)) }} transition={theme.motion.spring} />
      </Track>
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
    </Frame>
  );
}
