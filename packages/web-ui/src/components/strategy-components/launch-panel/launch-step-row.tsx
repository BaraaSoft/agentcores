import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import type { LaunchStepStatus } from './launch-step-status';
import { StepIndicator } from './step-indicator';

/** One step of the launch: its marker, its name, a line about it, and the reason when it failed. */
export interface LaunchStepRowProps {
  readonly number: number;
  readonly label: string;
  readonly detail: string;
  readonly status: LaunchStepStatus;
  readonly error: string | null;
  readonly isLast: boolean;
}

const Row = styled.li`
  position: relative;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  column-gap: ${({ theme }) => theme.space(3.5)};
  padding-bottom: ${({ theme }) => theme.space(5)};
  &:last-of-type {
    padding-bottom: 0;
  }
`;

const Rail = styled.span`
  position: absolute;
  top: 36px;
  bottom: 6px;
  left: 14px;
  width: 2px;
  overflow: hidden;
  border-radius: 1px;
  background: ${({ theme }) => theme.color.borderStrong};
`;

const RailFill = styled(motion.span)`
  position: absolute;
  inset: 0;
  transform-origin: top;
  background: linear-gradient(180deg, ${({ theme }) => theme.color.live}, rgba(76, 183, 130, 0.5));
`;

const Text = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding-top: 5px;
`;

const Label = styled.span<{ labelColor: string }>`
  color: ${({ labelColor }) => labelColor};
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  transition: color 160ms ease;
`;

const Detail = styled(motion.span)`
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.5;
`;

const ErrorNote = styled(motion.p)`
  margin: ${({ theme }) => theme.space(2)} 0 0;
  padding: ${({ theme }) => `${theme.space(2)} ${theme.space(2.5)}`};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.dangerSoft};
  box-shadow: inset 0 0 0 1px rgba(235, 87, 87, 0.25);
  color: #ffb3b3;
  font-size: ${({ theme }) => theme.font.size.xs};
  line-height: 1.5;
  overflow-wrap: anywhere;
`;

/** A step with a line down to the next one; the line fills green once this step is done. */
export function LaunchStepRow({ number, label, detail, status, error, isLast }: LaunchStepRowProps) {
  const theme = useTheme();
  const labelColor = status === 'waiting' ? theme.color.textMuted : status === 'failed' ? theme.color.danger : theme.color.text;
  return (
    <Row aria-current={status === 'running' ? 'step' : undefined}>
      {!isLast && (
        <Rail aria-hidden>
          <RailFill initial={false} animate={{ scaleY: status === 'done' ? 1 : 0 }} transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }} />
        </Rail>
      )}
      <StepIndicator number={number} status={status} />
      <Text>
        <Label labelColor={labelColor}>{label}</Label>
        <AnimatePresence mode="wait" initial={false}>
          <Detail key={detail} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={theme.motion.fast}>
            {detail}
          </Detail>
        </AnimatePresence>
        <AnimatePresence>
          {error !== null && (
            <ErrorNote role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={theme.motion.spring}>
              {error}
            </ErrorNote>
          )}
        </AnimatePresence>
      </Text>
    </Row>
  );
}
