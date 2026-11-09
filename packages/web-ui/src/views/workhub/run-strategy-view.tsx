import { AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Eye, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ActionButton } from '../../components/strategy-components/action-button/action-button';
import { FieldFrame } from '../../components/strategy-components/field-frame/field-frame';
import { TextField } from '../../components/strategy-components/text-field/text-field';
import { InfoTip } from '../../components/strategy-components/work-type-picker/info-tip';
import { ComposerPanel } from '../../components/workhub-components/composer-panel/composer-panel';
import { InlineNotice } from '../../components/workhub-components/inline-notice/inline-notice';
import { PillButton } from '../../components/workhub-components/pill-button/pill-button';
import { RunSteps } from '../../components/workhub-components/run-steps/run-steps';
import { StrategyOptionList } from '../../components/workhub-components/strategy-option-list/strategy-option-list';
import { ROUTE_PATHS } from '../../routes/route-paths';
import { useWorkHubStore } from '../../state/workhub-store';
import { DEFAULT_MACHINE, EMPTY_STRATEGY_DRAFT } from '../create-strategy/model/strategy-draft';
import { presentRunSteps } from './model/present-run-steps';
import { presentStrategyOptions } from './model/present-strategy-options';
import { workflowToPause } from './model/workflow-to-pause';

/** What the run panel asks its page to do. */
export interface RunStrategyViewProps {
  /** Scrolls to a Workflow's card and rings it. */
  readonly onReveal: (workflowId: string) => void;
  readonly onOpenMonitor: (workflowId: string) => void;
}

const FRESH_RUN_EXPLAINER =
  'A fresh run is a new workflow for this strategy. It starts at iteration 1 and learns from the earlier runs, which stay in the list.';

const RESOURCES = { maxConcurrentJobs: EMPTY_STRATEGY_DRAFT.maxConcurrentJobs, budgetLimit: Number(EMPTY_STRATEGY_DRAFT.budgetLimit) };

/**
 * The side panel that runs a Strategy again: a fresh Workflow that begins at its first iteration and plans
 * with what the earlier runs learned. It first pauses the Workflow that runs on the machine, with all its work.
 */
export function RunStrategyView({ onReveal, onOpenMonitor }: RunStrategyViewProps) {
  const navigate = useNavigate();
  const strategies = useWorkHubStore((state) => state.strategies);
  const workflows = useWorkHubStore((state) => state.workflows);
  const run = useWorkHubStore((state) => state.run);
  const runStrategy = useWorkHubStore((state) => state.runStrategy);
  const clearRun = useWorkHubStore((state) => state.clearRun);
  const options = useMemo(() => presentStrategyOptions(strategies, workflows), [strategies, workflows]);
  const [strategyId, setStrategyId] = useState<string | null>(null);

  const nameOf = (id: string | undefined) => strategies.find((strategy) => strategy.id === id)?.name ?? null;
  const runStrategyOf = strategies.find((strategy) => strategy.id === run?.strategyId);
  const pausedName = nameOf(workflows.find((workflow) => workflow.id === run?.pausedWorkflowId)?.strategyId);
  const presented = run === null || runStrategyOf === undefined ? null : presentRunSteps(run, pausedName, runStrategyOf.workType);
  const isBusy = presented?.isInProgress ?? false;
  const toPause = run === null ? workflowToPause(workflows, strategies, DEFAULT_MACHINE, null) : null;

  useEffect(() => {
    if (strategyId !== null && options.some((option) => option.id === strategyId)) return;
    setStrategyId(run?.strategyId ?? (options.find((option) => !option.isRunning) ?? options[0])?.id ?? null);
  }, [options, strategyId, run]);

  const pickStrategy = (id: string) => {
    setStrategyId(id);
    clearRun();
  };
  const submit = () => {
    if (strategyId !== null) void runStrategy(strategyId, { machineId: DEFAULT_MACHINE, resources: RESOURCES });
  };

  if (options.length === 0) {
    return (
      <ComposerPanel
        eyebrow="Run again"
        title="Run a strategy again"
        description="Each workflow is one run of a strategy. Create a strategy first; its first run starts right away."
        actions={
          <ActionButton icon={Plus} onClick={() => navigate(ROUTE_PATHS.createStrategy)}>
            Create a strategy
          </ActionButton>
        }
      >
        <InlineNotice tone="warning">You have no strategies yet.</InlineNotice>
      </ComposerPanel>
    );
  }

  const buttonLabel = isBusy
    ? 'Starting the fresh run…'
    : presented?.hasFailed === true
      ? 'Try again'
      : toPause !== null
        ? 'Pause it and run again'
        : 'Run the strategy again';

  return (
    <ComposerPanel
      eyebrow="Run again"
      title="Run a strategy again"
      description={
        <>
          Pick a strategy to run again on your machine. <InfoTip label="What is a fresh run?" text={FRESH_RUN_EXPLAINER} />
        </>
      }
      actions={
        <ActionButton icon={RotateCcw} onClick={submit} isBusy={isBusy} isDisabled={strategyId === null || isBusy}>
          {buttonLabel}
        </ActionButton>
      }
      footnote={`Each run gets ${RESOURCES.maxConcurrentJobs} Job at a time and a $${RESOURCES.budgetLimit} monthly budget.`}
    >
      <FieldFrame label="Strategy" htmlFor="workhub-strategy" aside={`${options.length} in all`}>
        <StrategyOptionList label="Strategy" options={options} value={strategyId} onChange={pickStrategy} />
      </FieldFrame>
      <TextField
        id="workhub-machine"
        label="Machine"
        value={DEFAULT_MACHINE}
        onChange={() => undefined}
        hint="Your co-worker works on one machine for now."
        isDisabled
      />
      <AnimatePresence mode="popLayout">
        {toPause !== null && (
          <InlineNotice
            key="to-pause"
            tone="warning"
            action={<PillButton label="Show it" icon={Eye} onClick={() => onReveal(toPause.id)} />}
          >
            "{toPause.strategyName}" is running now. Your co-worker works on one machine, so a fresh run pauses it and all its work first.
          </InlineNotice>
        )}
        {presented !== null && <RunSteps key="steps" label="Run steps" steps={presented.steps} progress={presented.progress} />}
        {presented?.isDone === true && run?.workflowId != null && (
          <InlineNotice
            key="done"
            tone="success"
            action={<PillButton label="Open in Monitor" icon={ArrowUpRight} onClick={() => onOpenMonitor(run.workflowId ?? '')} />}
          >
            The fresh run of "{runStrategyOf?.name}" has the machine now.
          </InlineNotice>
        )}
      </AnimatePresence>
    </ComposerPanel>
  );
}
