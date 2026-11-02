import { NotFoundException } from '@nestjs/common';
import type { StrategyService } from '../../../governance/services/strategy.service';
import type { TaskService } from '../../../governance/services/task.service';
import type { OrchestratorService } from '../../../orchestrator/orchestrator.service';
import type { WorkflowService } from '../../../workflow/workflow.service';
import { WorkflowResponseDto } from '../dtos/workflow-response.dto';
import { WorkflowsApiService } from '../workflows-api.service';

const RESOURCES = { maxConcurrentJobs: 2, budgetLimit: 500 } as const;
const CREATED_AT = new Date('2026-11-01T09:00:00Z');
const UPDATED_AT = new Date('2026-11-01T10:00:00Z');
const WORKFLOW = {
  id: 'wf-1',
  strategyId: 'strategy-1',
  machineId: 'baraa-macbook',
  state: 'paused',
  resources: RESOURCES,
  strategy: { id: 'strategy-1', owner: 'owner-1' },
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
};
const RESPONSE = {
  id: 'wf-1',
  strategyId: 'strategy-1',
  machineId: 'baraa-macbook',
  state: 'paused',
  resources: RESOURCES,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  activeTaskCount: 0,
};

function setup(found: unknown = WORKFLOW, strategy: unknown = WORKFLOW.strategy) {
  const workflows = {
    createWorkflow: jest.fn().mockResolvedValue(WORKFLOW),
    findWorkflowById: jest.fn().mockResolvedValue(found),
    listWorkflows: jest.fn().mockResolvedValue([WORKFLOW]),
  };
  const strategies = { findStrategyById: jest.fn().mockResolvedValue(strategy) };
  const orchestrator = {
    startWorkflow: jest.fn().mockResolvedValue({ ...WORKFLOW, state: 'running' }),
    pauseWorkflow: jest.fn().mockResolvedValue(WORKFLOW),
  };
  const tasks = { countRunningTasksByWorkflow: jest.fn().mockResolvedValue(new Map()) };
  const service = new WorkflowsApiService(
    workflows as unknown as WorkflowService,
    strategies as unknown as StrategyService,
    orchestrator as unknown as OrchestratorService,
    tasks as unknown as TaskService,
  );
  return { service, workflows, strategies, orchestrator, tasks };
}

describe('WorkflowsApiService', () => {
  it('creates a Workflow and returns only the public fields', async () => {
    const t = setup();
    const body = { strategyId: 'strategy-1', machineId: 'baraa-macbook', resources: RESOURCES };

    const created = await t.service.createWorkflow(body);

    expect(t.workflows.createWorkflow).toHaveBeenCalledWith(body);
    expect(created).toBeInstanceOf(WorkflowResponseDto);
    expect(created).toEqual(RESPONSE);
  });

  it('answers 404 and saves nothing when the Strategy does not exist', async () => {
    const t = setup(WORKFLOW, null);
    const body = { strategyId: 'strategy-x', machineId: 'baraa-macbook', resources: RESOURCES };

    await expect(t.service.createWorkflow(body)).rejects.toThrow(new NotFoundException('Strategy strategy-x not found'));
    expect(t.strategies.findStrategyById).toHaveBeenCalledWith('strategy-x');
    expect(t.workflows.createWorkflow).not.toHaveBeenCalled();
  });

  it('gets a Workflow, and answers 404 when it does not exist', async () => {
    expect(await setup().service.getWorkflow('wf-1')).toEqual(RESPONSE);
    await expect(setup(null).service.getWorkflow('wf-x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists the Workflows with only the public fields', async () => {
    expect(await setup().service.listWorkflows()).toEqual([RESPONSE]);
  });

  it('lists how many Tasks each Workflow is running, so the UI can tell when a paused run has freed the machine', async () => {
    const t = setup();
    t.tasks.countRunningTasksByWorkflow.mockResolvedValue(new Map([['wf-1', 1]]));

    expect(await t.service.listWorkflows()).toEqual([{ ...RESPONSE, activeTaskCount: 1 }]);
  });

  it('runs a Strategy again as a fresh Workflow and starts it through the orchestrator', async () => {
    const t = setup();
    const body = { machineId: 'Macbook', resources: RESOURCES };

    const run = await t.service.runStrategy('strategy-1', body);

    expect(t.workflows.createWorkflow).toHaveBeenCalledWith({ strategyId: 'strategy-1', ...body });
    expect(t.orchestrator.startWorkflow).toHaveBeenCalledWith('wf-1');
    expect(run).toMatchObject({ id: 'wf-1', state: 'running' });
  });

  it('answers 404 and creates no run when the Strategy does not exist', async () => {
    const t = setup(WORKFLOW, null);

    await expect(t.service.runStrategy('strategy-x', { machineId: 'Macbook', resources: RESOURCES })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(t.workflows.createWorkflow).not.toHaveBeenCalled();
    expect(t.orchestrator.startWorkflow).not.toHaveBeenCalled();
  });

  it('starts and pauses through the orchestrator', async () => {
    const t = setup();

    expect(await t.service.startWorkflow('wf-1')).toMatchObject({ id: 'wf-1', state: 'running' });
    expect(await t.service.pauseWorkflow('wf-1')).toMatchObject({ id: 'wf-1', state: 'paused' });
    expect(t.orchestrator.startWorkflow).toHaveBeenCalledWith('wf-1');
    expect(t.orchestrator.pauseWorkflow).toHaveBeenCalledWith('wf-1');
  });
});
