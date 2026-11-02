import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Repeat, Rocket, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ActionButton } from '../../components/strategy-components/action-button/action-button';
import { Disclosure } from '../../components/strategy-components/disclosure/disclosure';
import { FormSection } from '../../components/strategy-components/form-section/form-section';
import { LaunchPanel } from '../../components/strategy-components/launch-panel/launch-panel';
import { NumberStepper } from '../../components/strategy-components/number-stepper/number-stepper';
import { TextAreaField } from '../../components/strategy-components/text-area-field/text-area-field';
import { TextField } from '../../components/strategy-components/text-field/text-field';
import { WorkTypePicker } from '../../components/strategy-components/work-type-picker/work-type-picker';
import { ROUTE_PATHS } from '../../routes/route-paths';
import { useMonitorStore } from '../../state/monitor-store';
import { useStrategyLaunchStore } from '../../state/strategy-launch-store';
import { launchProgress, presentLaunchSteps } from './model/present-launch-steps';
import { DRAFT_LIMITS, EMPTY_STRATEGY_DRAFT, type StrategyDraft } from './model/strategy-draft';
import { toLaunchInput } from './model/to-launch-input';
import { validateDraft, type DraftErrors } from './model/validate-draft';
import { WORK_TYPE_OPTIONS } from './model/work-type-options';

/** How long the finished launch stays on screen before the page moves to Monitor. */
const MONITOR_DELAY_MS = 1_800;
const FIELD_ORDER: readonly (keyof DraftErrors)[] = ['name', 'objective', 'owner', 'machineId', 'budgetLimit'];
const OBJECTIVE_PLACEHOLDER = [
  'Design a launch Instagram post in Canva for the book at book.humanExperiences.io.',
  '- Post it on Instagram with a short, engaging caption.',
  '- Email me the link to the live post.',
].join('\n');

const Page = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) ${({ theme }) => theme.layout.sidePanelWidth};
  align-items: start;
  gap: ${({ theme }) => theme.space(12)};
  width: 100%;
  max-width: 1360px;
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space(10)} ${theme.space(12)} ${theme.space(16)}`};
  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
    gap: ${({ theme }) => theme.space(8)};
    padding: ${({ theme }) => `${theme.space(8)} ${theme.space(6)} ${theme.space(12)}`};
  }
`;

const Intro = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
  max-width: 640px;
  padding-bottom: ${({ theme }) => theme.space(8)};
`;

const Eyebrow = styled.span`
  color: ${({ theme }) => theme.color.accentText};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 11px;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const Headline = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.display};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  line-height: 1.15;
  letter-spacing: -0.028em;
  text-wrap: balance;
`;

const Lede = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.base};
  line-height: 1.6;
  text-wrap: pretty;
`;

const Form = styled.fieldset`
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
`;

const Pair = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space(5)};
  @media (max-width: 700px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Note = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => `${theme.space(3.5)} ${theme.space(4)}`};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.025);
  box-shadow: inset 0 0 0 1px ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.5;
`;

const Swap = styled(motion.div)``;

function workTypeCount(draft: StrategyDraft): string {
  if (draft.workType === 'one_off') return `Up to ${draft.maxAttempts} attempt${draft.maxAttempts === 1 ? '' : 's'}`;
  if (draft.workType === 'multi_version') return `${draft.versionCount} version${draft.versionCount === 1 ? '' : 's'}`;
  return 'Until you pause it';
}

/** The new strategy form beside its launch panel. Submitting creates the Strategy, its Workflow, and starts it, then opens Monitor. */
export function CreateStrategyView() {
  const theme = useTheme();
  const navigate = useNavigate();
  const selectWorkflow = useMonitorStore((state) => state.selectWorkflow);
  const steps = useStrategyLaunchStore((state) => state.steps);
  const strategyId = useStrategyLaunchStore((state) => state.strategyId);
  const workflowId = useStrategyLaunchStore((state) => state.workflowId);
  const launch = useStrategyLaunchStore((state) => state.launch);
  const retry = useStrategyLaunchStore((state) => state.retry);
  const reset = useStrategyLaunchStore((state) => state.reset);
  const [draft, setDraft] = useState<StrategyDraft>(EMPTY_STRATEGY_DRAFT);
  const [showErrors, setShowErrors] = useState(false);
  const errors = useMemo(() => validateDraft(draft), [draft]);
  const shownErrors = showErrors ? errors : {};
  const isRunning = Object.values(steps).some((step) => step.status === 'running');
  const isDone = steps.start.status === 'done';
  const hasFailed = Object.values(steps).some((step) => step.status === 'failed');
  const isLocked = isRunning || strategyId !== null;
  const update = <K extends keyof StrategyDraft>(key: K, value: StrategyDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = useCallback(() => {
    const firstError = FIELD_ORDER.find((field) => errors[field] !== undefined);
    if (firstError !== undefined) {
      setShowErrors(true);
      document.getElementById(`strategy-${firstError}`)?.focus();
      return;
    }
    launch(toLaunchInput(draft));
  }, [draft, errors, launch]);

  const openMonitor = useCallback(() => {
    if (workflowId !== null) selectWorkflow(workflowId);
    reset();
    navigate(ROUTE_PATHS.monitor);
  }, [navigate, reset, selectWorkflow, workflowId]);

  const startOver = () => {
    reset();
    setShowErrors(false);
  };

  useEffect(() => {
    if (!isDone) return;
    const timer = setTimeout(openMonitor, MONITOR_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isDone, openMonitor]);

  useEffect(() => {
    const submitOnShortcut = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !isLocked) submit();
    };
    window.addEventListener('keydown', submitOnShortcut);
    return () => window.removeEventListener('keydown', submitOnShortcut);
  }, [isLocked, submit]);

  const workTypeLabel = WORK_TYPE_OPTIONS.find((option) => option.value === draft.workType)?.label ?? draft.workType;
  const budget = Number(draft.budgetLimit);
  const advancedSummary = `${draft.maxConcurrentJobs} Job${draft.maxConcurrentJobs === 1 ? '' : 's'} at a time · $${Number.isFinite(budget) ? budget : '—'}`;

  const actions = isDone ? (
    <ActionButton icon={ArrowRight} onClick={openMonitor}>
      Open Monitor
    </ActionButton>
  ) : hasFailed && strategyId !== null ? (
    <>
      <ActionButton icon={RotateCcw} onClick={retry}>
        Retry
      </ActionButton>
      <ActionButton variant="quiet" icon={Repeat} onClick={startOver}>
        Start over
      </ActionButton>
    </>
  ) : (
    <ActionButton icon={Rocket} onClick={submit} isBusy={isRunning}>
      {isRunning ? 'Launching…' : hasFailed ? 'Try again' : 'Create and start'}
    </ActionButton>
  );
  const footnote = isDone
    ? 'Opening Monitor in a moment…'
    : isLocked
      ? 'Your co-worker takes control of this Mac once the work starts.'
      : '⌘ Enter also launches. Your co-worker takes control of this Mac once the work starts.';

  return (
    <Page>
      <div>
        <Intro>
          <Eyebrow>New strategy</Eyebrow>
          <Headline>What should your co-worker achieve?</Headline>
          <Lede>
            Describe the outcome in your own words. Your co-worker researches it, plans the work, carries it out on your machine, and
            marks its own results.
          </Lede>
        </Intro>
        <Form disabled={isLocked}>
          <FormSection index="01" title="The goal" description="A short name to find it by, and the outcome you want, as you would brief a colleague.">
            <TextField
              id="strategy-name"
              label="Name"
              value={draft.name}
              onChange={(value) => update('name', value)}
              placeholder="Book launch post"
              maxLength={DRAFT_LIMITS.nameLength}
              isProminent
              {...(shownErrors.name === undefined ? {} : { error: shownErrors.name })}
            />
            <TextAreaField
              id="strategy-objective"
              label="Objective"
              value={draft.objective}
              onChange={(value) => update('objective', value)}
              maxLength={DRAFT_LIMITS.objectiveLength}
              rows={10}
              placeholder={OBJECTIVE_PLACEHOLDER}
              hint="Write it as you would message a colleague, one step per line. Your co-worker cannot see anything you leave out."
              {...(shownErrors.objective === undefined ? {} : { error: shownErrors.objective })}
            />
          </FormSection>
          <FormSection index="02" title="How the work repeats" description="Choose how your co-worker paces the work. Hover the info icon for the full meaning.">
            <WorkTypePicker label="Work type" options={WORK_TYPE_OPTIONS} value={draft.workType} onChange={(value) => update('workType', value)} isDisabled={isLocked} />
            <AnimatePresence mode="wait" initial={false}>
              <Swap key={draft.workType} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={theme.motion.fast}>
                {draft.workType === 'one_off' && (
                  <NumberStepper
                    id="strategy-attempts"
                    label="Attempts"
                    unit="attempts"
                    value={draft.maxAttempts}
                    min={DRAFT_LIMITS.attempts.min}
                    max={DRAFT_LIMITS.attempts.max}
                    onChange={(value) => update('maxAttempts', value)}
                    hint="Each attempt is marked out of 10. Your co-worker stops early once the work is good."
                  />
                )}
                {draft.workType === 'multi_version' && (
                  <NumberStepper
                    id="strategy-versions"
                    label="Versions"
                    unit="versions"
                    value={draft.versionCount}
                    min={DRAFT_LIMITS.versions.min}
                    max={DRAFT_LIMITS.versions.max}
                    onChange={(value) => update('versionCount', value)}
                    hint="Each version is complete on its own and takes a different direction."
                  />
                )}
                {draft.workType === 'continuous' && (
                  <Note>
                    <Repeat size={16} strokeWidth={2} aria-hidden />
                    Runs in rounds until you pause it from Monitor. Each round is marked, so later rounds lean on what worked.
                  </Note>
                )}
              </Swap>
            </AnimatePresence>
          </FormSection>
          <FormSection index="03" title="Where it runs" description="Who your co-worker acts for, and the machine it controls while it works.">
            <Pair>
              <TextField
                id="strategy-owner"
                label="Owner"
                value={draft.owner}
                onChange={(value) => update('owner', value)}
                maxLength={DRAFT_LIMITS.ownerLength}
                {...(shownErrors.owner === undefined ? {} : { error: shownErrors.owner })}
              />
              <TextField
                id="strategy-machineId"
                label="Machine"
                value={draft.machineId}
                onChange={(value) => update('machineId', value)}
                maxLength={DRAFT_LIMITS.machineIdLength}
                {...(shownErrors.machineId === undefined ? {} : { error: shownErrors.machineId })}
              />
            </Pair>
            <Disclosure title="Advanced" summary={advancedSummary} badge="Coming soon">
              <Pair>
                <NumberStepper
                  id="strategy-concurrency"
                  label="Jobs at a time"
                  unit={draft.maxConcurrentJobs === 1 ? 'Job' : 'Jobs'}
                  value={draft.maxConcurrentJobs}
                  min={DRAFT_LIMITS.concurrentJobs.min}
                  max={DRAFT_LIMITS.concurrentJobs.max}
                  onChange={(value) => update('maxConcurrentJobs', value)}
                  hint="Keep 1 for screen work. Tasks share one screen."
                />
                <TextField
                  id="strategy-budgetLimit"
                  label="Monthly budget"
                  value={draft.budgetLimit}
                  onChange={(value) => update('budgetLimit', value.replace(/[^\d.]/g, ''))}
                  inputMode="decimal"
                  prefix="$"
                  hint="A ceiling in US dollars for paid channels and model use."
                  {...(shownErrors.budgetLimit === undefined ? {} : { error: shownErrors.budgetLimit })}
                />
              </Pair>
            </Disclosure>
          </FormSection>
        </Form>
      </div>
      <LaunchPanel
        title="Summary"
        summary={[
          { label: 'Name', value: draft.name.trim() || 'Untitled strategy' },
          { label: 'Work type', value: workTypeLabel },
          { label: 'Runs', value: workTypeCount(draft) },
          { label: 'Machine', value: draft.machineId.trim() || '—' },
        ]}
        steps={presentLaunchSteps(steps)}
        progress={launchProgress(steps)}
        actions={actions}
        footnote={footnote}
      />
    </Page>
  );
}
