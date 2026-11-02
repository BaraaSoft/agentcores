import type { JobProgress } from '../../../api/types/job-progress';
import type { UnitOfWorkProgress } from '../../../api/types/unit-of-work-progress';
import type { WorkflowProgress } from '../../../api/types/workflow-progress';
import type { StatusTone } from '../../../components/monitoring-components/types/status-tone';
import type { Board } from './board';
import { elbowPath } from './elbow-path';
import type { NodePresentation } from './node-presentation';
import { presentJob } from './present-job';
import { presentStrategy } from './present-strategy';
import { presentTask } from './present-task';
import { presentUnit } from './present-unit';

const CARD_HEIGHT = 74;
const ROW_GAP = 18;
const UNIT_GAP = 16;
const LANE_HEADER = 52;
const LANE_PADDING = 16;
const LANE_GAP = 28;
const LANE_BOTTOM = 22;
const LANES = [
  { id: 'strategy', label: 'Strategy', cardWidth: 220 },
  { id: 'units', label: 'Units of work', cardWidth: 240 },
  { id: 'jobs', label: 'Jobs', cardWidth: 260 },
  { id: 'tasks', label: 'Tasks', cardWidth: 310 },
] as const;

type Node = Board['nodes'][number];
type Edge = Board['edges'][number];

/** The tone an edge takes from the card it leads to. */
function edgeTone(childTone: StatusTone): StatusTone {
  return childTone === 'scored' ? 'done' : childTone;
}

/** True when an ordered Job must wait, because an ordered Job before it in the Unit is still open. */
function waitsForEarlierJob(job: JobProgress, unit: UnitOfWorkProgress): boolean {
  if (job.orderNumber === null) return false;
  return unit.jobs.some((other) => other.orderNumber !== null && other.orderNumber < job.orderNumber! && other.outcomeStatus === null);
}

/**
 * Lays the work out as a tree, one lane per level: the Strategy, its Units of Work, their Jobs, and
 * their Tasks. Each Task takes a row; a parent sits level with its first child; edges join them.
 */
export function buildBoard(progress: WorkflowProgress): Board {
  const laneX = LANES.map((_, index) => LANES.slice(0, index).reduce((x, lane) => x + lane.cardWidth + LANE_PADDING * 2 + LANE_GAP, 0));
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const place = (id: string, level: number, y: number, presentation: NodePresentation): Node => {
    const node = { ...presentation, id, x: laneX[level] + LANE_PADDING, y, width: LANES[level].cardWidth, height: CARD_HEIGHT };
    nodes.push(node);
    return node;
  };
  const connect = (parent: Node, child: Node): void => {
    const fromY = parent.y + CARD_HEIGHT / 2;
    const toY = child.y + CARD_HEIGHT / 2;
    const { path, midX } = elbowPath({ fromX: parent.x + parent.width, fromY, toX: child.x, toY });
    const tone = edgeTone(child.tone);
    const label = child.badge === 'Running' && child.id.startsWith('task:') ? { text: 'now', x: midX, y: fromY === toY ? toY : (fromY + toY) / 2 } : undefined;
    edges.push({ id: `${parent.id}->${child.id}`, path, tone, ...(label === undefined ? {} : { label }) });
  };
  let cursor = LANE_HEADER;
  const strategy = place(`strategy:${progress.strategy.id}`, 0, cursor, presentStrategy(progress));
  progress.unitsOfWork.forEach((unit, unitIndex) => {
    if (unitIndex > 0) cursor += UNIT_GAP;
    const unitY = cursor;
    const jobs = unit.jobs.map((job) => ({ job, presentation: presentJob(job, waitsForEarlierJob(job, unit), unit.state === 'paused') }));
    const unitNode = place(`unit:${unit.id}`, 1, unitY, presentUnit(unit, jobs.some(({ presentation }) => presentation.tone === 'live')));
    connect(strategy, unitNode);
    if (jobs.length === 0) cursor += CARD_HEIGHT + ROW_GAP;
    for (const { job, presentation } of jobs) {
      const jobNode = place(`job:${job.id}`, 2, cursor, presentation);
      connect(unitNode, jobNode);
      if (job.tasks.length === 0) cursor += CARD_HEIGHT + ROW_GAP;
      for (const task of job.tasks) {
        connect(jobNode, place(`task:${task.id}`, 3, cursor, presentTask(task)));
        cursor += CARD_HEIGHT + ROW_GAP;
      }
    }
  });
  const height = Math.max(cursor - ROW_GAP + LANE_BOTTOM, LANE_HEADER + CARD_HEIGHT + LANE_BOTTOM);
  const count = (prefix: string) => nodes.filter((node) => node.id.startsWith(prefix)).length;
  const prefixes = ['strategy:', 'unit:', 'job:', 'task:'];
  return {
    width: laneX[LANES.length - 1] + LANES[LANES.length - 1].cardWidth + LANE_PADDING * 2,
    height,
    lanes: LANES.map((lane, index) => ({ id: lane.id, label: lane.label, count: count(prefixes[index]), x: laneX[index], width: lane.cardWidth + LANE_PADDING * 2 })),
    nodes,
    edges,
  };
}
