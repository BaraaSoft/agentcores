import { AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Eye, Plus, Rocket } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ActionButton } from '../../components/strategy-components/action-button/action-button';
import { FieldFrame } from '../../components/strategy-components/field-frame/field-frame';
import { TextField } from '../../components/strategy-components/text-field/text-field';
import { ComposerPanel } from '../../components/workhub-components/composer-panel/composer-panel';
import { InlineNotice } from '../../components/workhub-components/inline-notice/inline-notice';
import { PillButton } from '../../components/workhub-components/pill-button/pill-button';
import { StrategyOptionList } from '../../components/workhub-components/strategy-option-list/strategy-option-list';
import { ToggleSwitch } from '../../components/workhub-components/toggle-switch/toggle-switch';
import { ROUTE_PATHS } from '../../routes/route-paths';
import { useWorkHubStore } from '../../state/workhub-store';
import { AHE_MACHINE, EMPTY_STRATEGY_DRAFT } from '../create-strategy/model/strategy-draft';
import { presentStrategyOptions } from './model/present-strategy-options';
import { workflowToPause } from './model/workflow-to-pause';

/** What the new Workflow panel asks its page to do. */
export interface NewWorkflowViewProps {
  /** Scrolls to a Workflow's card and rings it. */
  readonly onReveal: (workflowId: string) => void;
  readonly onOpenMonitor: (workflowId: string) => void;
}

const RESOURCES = { maxConcurrentJobs: EMPTY_STRATEGY_DRAFT.maxConcurrentJobs, budgetLimit: Number(EMPTY_STRATEGY_DRAFT.budgetLimit) };

/** The side panel that runs an existing Strategy on the co-worker's machine. It warns before a second Workflow for the same Strategy. */
export function NewWorkflowView({ onReveal, onOpenMonitor }: NewWorkflowViewProps) {
  const navigate = useNavigate();
  const strategies = useWorkHubStore((state) => state.strategies);
  const workflows = useWorkHubStore((state) => state.workflows);
  const creation = useWorkHubStore((state) => state.creation);
  const createWorkflow = useWorkHubStore((state) => state.createWorkflow);
  const clearCreation = useWorkHubStore((state) => state.clearCreation);
  const options = useMemo(() => presentStrategyOptions(strategies, workflows), [strategies, workflows]);
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [startNow, setStartNow] = useState(true);
  const selected = options.find((option) => option.id === strategyId) ?? null;
  const conflict = workflows.find((workflow) => workflow.strategyId === strategyId && workflow.machineId === AHE_MACHINE) ?? null;
  const isRunning = creation.status === 'running';
  const toPause = startNow && conflict === null ? workflowToPause(workflows, strategies, AHE_MACHINE, null) : null;

  useEffect(() => {
    if (strategyId !== null && options.some((option) => option.id === strategyId)) return;
    const free = options.find(
      (option) => !workflows.some((workflow) => workflow.strategyId === option.id && workflow.machineId === AHE_MACHINE),
    );
    setStrategyId((free ?? options[0])?.id ?? null);
  }, [options, workflows, strategyId]);

  useEffect(() => clearCreation, [clearCreation]);

  const pickStrategy = (id: string) => {
    setStrategyId(id);
    if (creation.status !== 'running') clearCreation();
  };
  const submit = () => {
    if (strategyId === null || conflict !== null) return;
    void createWorkflow({ strategyId, machineId: AHE_MACHINE, resources: RESOURCES, startNow });
  };

  if (options.length === 0) {
    return (
      <ComposerPanel
        eyebrow="New workflow"
        title="Run a strategy"
        description="A workflow runs one of your strategies on your machine. Create a strategy first, then come back to run it."
        actions={
          <ActionButton icon={Plus} onClick={() => navigate(ROUTE_PATHS.createStrategy)}>
            Create a strategy
          </ActionButton>
        }
      >
        <InlineNotice tone="warning">
          {strategies.length === 0 ? 'You have no strategies yet.' : 'All your strategies are complete.'}
        </InlineNotice>
      </ComposerPanel>
    );
  }

  return (
    <ComposerPanel
      eyebrow="New workflow"
      title="Run a strategy"
      description="Pick a strategy that has no workflow yet. Your co-worker runs it on your machine."
      actions={
        <ActionButton
          icon={startNow ? Rocket : Plus}
          onClick={submit}
          isBusy={isRunning}
          isDisabled={strategyId === null || conflict !== null}
        >
          {isRunning ? 'Creating…' : toPause !== null ? 'Pause it and start' : startNow ? 'Create and start' : 'Create workflow'}
        </ActionButton>
      }
      footnote={`Each new workflow gets ${RESOURCES.maxConcurrentJobs} Job at a time and a $${RESOURCES.budgetLimit} monthly budget.`}
    >
      <FieldFrame label="Strategy" htmlFor="workhub-strategy" aside={`${options.length} active`}>
        <StrategyOptionList label="Strategy" options={options} value={strategyId} onChange={pickStrategy} />
      </FieldFrame>
      <TextField
        id="workhub-machine"
        label="Machine"
        value={AHE_MACHINE}
        onChange={() => undefined}
        hint="Your co-worker works on one machine for now."
        isDisabled
      />
      <ToggleSwitch
        label="Start right away"
        description="Your co-worker begins planning as soon as the workflow exists."
        isOn={startNow}
        onChange={setStartNow}
      />
      <AnimatePresence mode="popLayout">
        {conflict !== null && creation.status !== 'done' && (
          <InlineNotice
            key="conflict"
            tone="warning"
            action={<PillButton label="Show it" icon={Eye} onClick={() => onReveal(conflict.id)} />}
          >
            {selected?.name ?? 'This strategy'} already has a workflow.{' '}
            {conflict.state === 'running' ? 'It is working now.' : 'Resume it from its card to continue.'}
          </InlineNotice>
        )}
        {toPause !== null && creation.status !== 'done' && (
          <InlineNotice
            key="to-pause"
            tone="warning"
            action={<PillButton label="Show it" icon={Eye} onClick={() => onReveal(toPause.id)} />}
          >
            "{toPause.strategyName}" is running now. Your co-worker works on one machine, so starting this pauses it. Turn off "Start right
            away" to keep it running.
          </InlineNotice>
        )}
        {creation.status === 'done' && (
          <InlineNotice
            key="done"
            tone="success"
            action={<PillButton label="Open in Monitor" icon={ArrowUpRight} onClick={() => onOpenMonitor(creation.workflowId)} />}
          >
            {creation.started ? 'Workflow created and started.' : 'Workflow created. Resume it when you are ready.'}
          </InlineNotice>
        )}
        {creation.status === 'failed' && (
          <InlineNotice key="failed" tone="danger">
            {creation.error}
          </InlineNotice>
        )}
      </AnimatePresence>
    </ComposerPanel>
  );
}
