import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Clock3, Gauge, Laptop, Pause, Play, Wallet, X } from 'lucide-react';
import type { WorkflowState } from '../../../api/types/workflow-state';
import { glassSurface } from '../../../theme/glass-surface';
import { StatusBadge } from '../../monitoring-components/status-badge/status-badge';
import { InlineNotice } from '../inline-notice/inline-notice';
import { PillButton } from '../pill-button/pill-button';

/** What one Workflow card shows. A Workflow is one run of its Strategy. */
export interface WorkflowCardData {
  readonly id: string;
  readonly state: WorkflowState;
  /** Paused, but a Task still ends its current step, so the machine is not free yet. */
  readonly isFreeingMachine: boolean;
  readonly strategyName: string;
  /** Such as "Run 2": which run of the Strategy this is. */
  readonly runLine: string;
  readonly objective: string;
  readonly workTypeLine: string;
  readonly machineId: string;
  readonly concurrencyLine: string;
  readonly budgetLine: string;
  /** Such as "Running for 2 h" or "Paused 5 min ago". */
  readonly timeLine: string;
}

/** One Workflow: its Strategy, where it runs, its limits, and the buttons to pause, resume, or open it. A done Workflow is final, so it has no resume. */
export interface WorkflowCardProps {
  readonly workflow: WorkflowCardData;
  readonly action: 'pausing' | 'resuming' | null;
  readonly error: string | null;
  /** Briefly rings the card in blue, for a Workflow that was just created. */
  readonly isNew: boolean;
  /** A question to confirm before the resume, such as which running Workflow it pauses. Null shows no question. */
  readonly confirmation: string | null;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onConfirmResume: () => void;
  readonly onCancelResume: () => void;
  readonly onOpen: () => void;
}

const Card = styled(motion.article)<{ stripe: string; stripeGlow: string }>`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.space(6)};
  padding: ${({ theme }) => `${theme.space(5)} ${theme.space(6)} ${theme.space(5)} ${theme.space(7)}`};
  border-radius: ${({ theme }) => theme.radius.lg};
  ${({ theme }) => glassSurface(theme, 'raised')};
  & > * {
    position: relative;
  }
  &::after {
    content: '';
    position: absolute;
    top: 16px;
    bottom: 16px;
    left: 0;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: ${({ stripe }) => stripe};
    box-shadow: 0 0 12px ${({ stripeGlow }) => stripeGlow};
  }
  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Ring = styled(motion.span)`
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow:
    inset 0 0 0 1px ${({ theme }) => theme.color.accent},
    0 0 24px -4px ${({ theme }) => theme.color.accent};
  pointer-events: none;
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
  min-width: 0;
`;

const TopLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
`;

const WorkType = styled.span`
  color: ${({ theme }) => theme.color.textFaint};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
`;

const Title = styled.h3`
  margin: ${({ theme }) => theme.space(0.5)} 0 0;
  overflow: hidden;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  line-height: 1.3;
  letter-spacing: -0.015em;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Objective = styled.p`
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.md};
  line-height: 1.55;
  white-space: pre-line;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`;

const Meta = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => `${theme.space(1.5)} ${theme.space(4)}`};
  margin: ${({ theme }) => theme.space(1.5)} 0 0;
  padding: 0;
  list-style: none;
`;

const MetaItem = styled.li`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.xs};
  & > svg {
    color: ${({ theme }) => theme.color.textFaint};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${({ theme }) => theme.space(2)};
  @media (max-width: 760px) {
    flex-direction: row;
  }
`;

const ErrorNote = styled(motion.p)`
  margin: ${({ theme }) => theme.space(1)} 0 0;
  padding: ${({ theme }) => `${theme.space(2)} ${theme.space(3)}`};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.dangerSoft};
  color: ${({ theme }) => theme.color.danger};
  font-size: ${({ theme }) => theme.font.size.xs};
`;

const FreeingNote = styled(motion.p)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  margin: ${({ theme }) => theme.space(1)} 0 0;
  color: ${({ theme }) => theme.color.warning};
  font-size: ${({ theme }) => theme.font.size.xs};
`;

const Spinner = styled(motion.span)`
  flex-shrink: 0;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  border-top-color: transparent;
`;

const ConfirmActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(2)};
`;

const BADGES: Record<WorkflowState, { label: string; tone: 'live' | 'waiting' | 'done' }> = {
  running: { label: 'Running', tone: 'live' },
  paused: { label: 'Paused', tone: 'waiting' },
  done: { label: 'Done', tone: 'done' },
};

/** A glass card with a status stripe on its left edge: green and glowing while running, grey while paused or done. */
export function WorkflowCard({
  workflow,
  action,
  error,
  isNew,
  confirmation,
  onPause,
  onResume,
  onConfirmResume,
  onCancelResume,
  onOpen,
}: WorkflowCardProps) {
  const theme = useTheme();
  const isRunning = workflow.state === 'running';
  return (
    <Card
      layout
      id={`workflow-${workflow.id}`}
      stripe={isRunning ? theme.color.live : theme.color.borderStrong}
      stripeGlow={isRunning ? theme.color.live : 'transparent'}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={theme.motion.spring}
      aria-label={`${workflow.strategyName}, ${workflow.runLine}, ${workflow.state}`}
    >
      <AnimatePresence>
        {isNew && (
          <Ring initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 3.2, times: [0, 0.1, 0.7, 1] }} />
        )}
      </AnimatePresence>
      <Body>
        <TopLine>
          <StatusBadge label={BADGES[workflow.state].label} tone={BADGES[workflow.state].tone} />
          <WorkType>
            {workflow.runLine} · {workflow.workTypeLine}
          </WorkType>
        </TopLine>
        <Title title={workflow.strategyName}>{workflow.strategyName}</Title>
        <Objective title={workflow.objective}>{workflow.objective}</Objective>
        <Meta>
          <MetaItem>
            <Laptop size={13} strokeWidth={2} aria-hidden />
            {workflow.machineId}
          </MetaItem>
          <MetaItem>
            <Gauge size={13} strokeWidth={2} aria-hidden />
            {workflow.concurrencyLine}
          </MetaItem>
          <MetaItem>
            <Wallet size={13} strokeWidth={2} aria-hidden />
            {workflow.budgetLine}
          </MetaItem>
          <MetaItem>
            <Clock3 size={13} strokeWidth={2} aria-hidden />
            {workflow.timeLine}
          </MetaItem>
        </Meta>
        <AnimatePresence>
          {workflow.isFreeingMachine && (
            <FreeingNote
              key="freeing"
              role="status"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Spinner animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} aria-hidden />
              Finishing its current step. The machine is free after it.
            </FreeingNote>
          )}
          {confirmation !== null && (
            <InlineNotice
              key="confirm"
              tone="warning"
              action={
                <ConfirmActions>
                  <PillButton label="Pause it and resume" icon={Play} tone="resume" onClick={onConfirmResume} />
                  <PillButton label="Cancel" icon={X} onClick={onCancelResume} tone="quiet" />
                </ConfirmActions>
              }
            >
              {confirmation}
            </InlineNotice>
          )}
          {error !== null && (
            <ErrorNote
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {error}
            </ErrorNote>
          )}
        </AnimatePresence>
      </Body>
      <Actions>
        {isRunning ? (
          <PillButton
            label={action === 'pausing' ? 'Pausing' : 'Pause'}
            icon={Pause}
            tone="pause"
            onClick={onPause}
            isBusy={action === 'pausing'}
          />
        ) : workflow.state === 'paused' ? (
          <PillButton
            label={action === 'resuming' ? 'Resuming' : 'Resume'}
            icon={Play}
            tone="resume"
            onClick={onResume}
            isBusy={action === 'resuming'}
          />
        ) : null}
        <PillButton label="Monitor" icon={ArrowUpRight} onClick={onOpen} />
      </Actions>
    </Card>
  );
}
