import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Laptop, Pause, Plus, Target, Workflow } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { EmptyState } from '../../components/empty-state/empty-state';
import { PageIntro } from '../../components/page-intro/page-intro';
import { SidePanelLayout } from '../../components/side-panel-layout/side-panel-layout';
import { ActionButton } from '../../components/strategy-components/action-button/action-button';
import { InfoTip } from '../../components/strategy-components/work-type-picker/info-tip';
import { HubMetric } from '../../components/workhub-components/hub-metric/hub-metric';
import { InlineNotice } from '../../components/workhub-components/inline-notice/inline-notice';
import { SearchField } from '../../components/workhub-components/search-field/search-field';
import { SegmentedFilter } from '../../components/workhub-components/segmented-filter/segmented-filter';
import { WorkflowCard } from '../../components/workhub-components/workflow-card/workflow-card';
import { ROUTE_PATHS } from '../../routes/route-paths';
import { useMonitorStore } from '../../state/monitor-store';
import { useWorkHubStore } from '../../state/workhub-store';
import { AHE_MACHINE } from '../create-strategy/model/strategy-draft';
import { presentWorkflowCards } from './model/present-workflow-cards';
import { filterWorkflowCards, type WorkflowFilter } from './model/workflow-filter';
import { workflowToPause } from './model/workflow-to-pause';
import { RunStrategyView } from './run-strategy-view';

/** How often the time lines on the cards move on. */
const CLOCK_TICK_MS = 30_000;
/** How long a revealed or new card keeps its blue ring. */
const RING_MS = 3_200;

const WORKFLOW_EXPLAINER =
  'A strategy is your goal. A workflow is one run of that goal on your machine, and it is running, paused, or done. Pause a run and resume it later, or run the strategy again: the new run starts over and learns from the earlier ones.';

const Metrics = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space(3)};
  margin-top: ${({ theme }) => theme.space(8)};
  @media (max-width: 1280px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  margin: ${({ theme }) => `${theme.space(10)} 0 ${theme.space(4)}`};
`;

const ListHeading = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.color.textMuted};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
`;

const Quiet = styled(motion.p)`
  margin: 0;
  padding: ${({ theme }) => `${theme.space(10)} 0`};
  color: ${({ theme }) => theme.color.textFaint};
  font-size: ${({ theme }) => theme.font.size.sm};
  text-align: center;
`;

const Offline = styled.div`
  margin-bottom: ${({ theme }) => theme.space(3)};
`;

const EmptyFrame = styled.div`
  display: flex;
  min-height: 320px;
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: inset 0 0 0 1px ${({ theme }) => theme.color.border};
`;

/**
 * Every Workflow with its Strategy and status, the buttons to pause or resume each one, and a panel to run a
 * Strategy again. A Strategy is a reusable goal; each Workflow is one run of it: running, paused, or done.
 */
export function WorkHubView() {
  const theme = useTheme();
  const navigate = useNavigate();
  const selectWorkflow = useMonitorStore((state) => state.selectWorkflow);
  const connection = useWorkHubStore((state) => state.connection);
  const workflows = useWorkHubStore((state) => state.workflows);
  const strategies = useWorkHubStore((state) => state.strategies);
  const actions = useWorkHubStore((state) => state.actions);
  const actionErrors = useWorkHubStore((state) => state.actionErrors);
  const newRunId = useWorkHubStore((state) => state.run?.workflowId ?? null);
  const startPolling = useWorkHubStore((state) => state.startPolling);
  const pauseWorkflow = useWorkHubStore((state) => state.pauseWorkflow);
  const resumeWorkflow = useWorkHubStore((state) => state.resumeWorkflow);
  const [filter, setFilter] = useState<WorkflowFilter>('all');
  const [query, setQuery] = useState('');
  const [ringedId, setRingedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => startPolling(), [startPolling]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const ring = useCallback((workflowId: string) => {
    setFilter('all');
    setQuery('');
    setRingedId(workflowId);
    requestAnimationFrame(() => document.getElementById(`workflow-${workflowId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }, []);

  useEffect(() => {
    if (newRunId !== null) ring(newRunId);
  }, [newRunId, ring]);
  useEffect(() => {
    if (ringedId === null) return;
    const timer = setTimeout(() => setRingedId(null), RING_MS);
    return () => clearTimeout(timer);
  }, [ringedId]);

  const openMonitor = useCallback(
    (workflowId: string) => {
      selectWorkflow(workflowId);
      navigate(ROUTE_PATHS.monitor);
    },
    [navigate, selectWorkflow],
  );

  const toPauseFor = (workflowId: string) => {
    const machineId = workflows.find((workflow) => workflow.id === workflowId)?.machineId ?? AHE_MACHINE;
    return workflowToPause(workflows, strategies, machineId, workflowId);
  };
  const requestResume = (workflowId: string) => {
    if (toPauseFor(workflowId) === null) void resumeWorkflow(workflowId);
    else setConfirmingId(workflowId);
  };
  const confirmResume = (workflowId: string) => {
    setConfirmingId(null);
    void resumeWorkflow(workflowId);
  };
  const confirmationFor = (workflowId: string): string | null => {
    if (confirmingId !== workflowId) return null;
    const running = toPauseFor(workflowId);
    return running === null
      ? null
      : `"${running.strategyName}" is running now. Your co-worker works on one machine, so this pauses it and all its work.`;
  };

  const cards = useMemo(() => presentWorkflowCards(workflows, strategies, now), [workflows, strategies, now]);
  const shown = filterWorkflowCards(cards, filter, query);
  const runningCount = workflows.filter((workflow) => workflow.state === 'running').length;
  const pausedCount = workflows.filter((workflow) => workflow.state === 'paused').length;
  const doneCount = workflows.filter((workflow) => workflow.state === 'done').length;
  const isLoading = connection === 'connecting' && workflows.length === 0;

  const list = isLoading ? (
    <Quiet initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      Loading your workflows…
    </Quiet>
  ) : workflows.length === 0 ? (
    <EmptyFrame>
      <EmptyState
        icon={Workflow}
        title="No workflows yet"
        description={
          strategies.length === 0
            ? 'Create a strategy and your co-worker starts its first workflow. It shows up here, ready to pause or resume.'
            : 'Pick one of your strategies in the panel on the right, and run it. Each run shows up here as a workflow.'
        }
        {...(strategies.length === 0
          ? {
              action: (
                <ActionButton icon={Plus} onClick={() => navigate(ROUTE_PATHS.createStrategy)}>
                  Create a strategy
                </ActionButton>
              ),
            }
          : {})}
      />
    </EmptyFrame>
  ) : (
    <List>
      <AnimatePresence mode="popLayout" initial={false}>
        {shown.map((card) => (
          <WorkflowCard
            key={card.id}
            workflow={card}
            action={actions[card.id] ?? null}
            error={actionErrors[card.id] ?? null}
            isNew={ringedId === card.id}
            onPause={() => void pauseWorkflow(card.id)}
            confirmation={confirmationFor(card.id)}
            onResume={() => requestResume(card.id)}
            onConfirmResume={() => confirmResume(card.id)}
            onCancelResume={() => setConfirmingId(null)}
            onOpen={() => openMonitor(card.id)}
          />
        ))}
      </AnimatePresence>
      {shown.length === 0 && (
        <Quiet initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={theme.motion.fast}>
          No workflows match. Try another filter or search.
        </Quiet>
      )}
    </List>
  );

  return (
    <SidePanelLayout
      main={
        <>
          <PageIntro eyebrow="WorkHub" title="Every workflow, in one place.">
            Start a strategy you already have from the beginning. Your co-worker begins again at iteration 1, and it uses what the earlier
            runs learned. <InfoTip label="What is a workflow?" text={WORKFLOW_EXPLAINER} />
          </PageIntro>
          <Metrics>
            <HubMetric label="Running" value={runningCount} hint="Working right now" icon={Activity} tone="live" />
            <HubMetric label="Paused" value={pausedCount} hint={pausedCount === 0 ? 'Nothing on hold' : 'Ready to resume'} icon={Pause} />
            <HubMetric
              label="Strategies"
              value={strategies.length}
              hint={`${workflows.length} run${workflows.length === 1 ? '' : 's'} · ${doneCount} done`}
              icon={Target}
            />
            <HubMetric label="Machine" value={1} hint={AHE_MACHINE} icon={Laptop} />
          </Metrics>
          <Toolbar>
            <ListHeading>Workflows</ListHeading>
            <Controls>
              <SegmentedFilter
                label="Workflow status"
                options={[
                  { value: 'all', label: 'All', count: workflows.length },
                  { value: 'running', label: 'Running', count: runningCount },
                  { value: 'paused', label: 'Paused', count: pausedCount },
                  { value: 'done', label: 'Done', count: doneCount },
                ]}
                value={filter}
                onChange={setFilter}
              />
              <SearchField label="Search workflows" value={query} onChange={setQuery} placeholder="Search strategy or machine" />
            </Controls>
          </Toolbar>
          <AnimatePresence>
            {connection === 'offline' && (
              <Offline>
                <InlineNotice tone="danger">The backend does not answer. WorkHub tries again every few seconds.</InlineNotice>
              </Offline>
            )}
          </AnimatePresence>
          {list}
        </>
      }
      aside={<RunStrategyView onReveal={ring} onOpenMonitor={openMonitor} />}
    />
  );
}
