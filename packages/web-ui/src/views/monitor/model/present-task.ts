import { MousePointerClick, Palette, Send, type LucideIcon } from 'lucide-react';
import type { TaskProgress } from '../../../api/types/task-progress';
import type { StatusTone } from '../../../components/monitoring-components/types/status-tone';
import type { NodePresentation } from './node-presentation';

const SKILLS: Record<TaskProgress['skillType'], { readonly icon: LucideIcon; readonly label: string }> = {
  general: { icon: MousePointerClick, label: 'computer use' },
  creative_design: { icon: Palette, label: 'creative design' },
  social_post: { icon: Send, label: 'social post' },
};

const STATUSES: Record<TaskProgress['status'], { readonly tone: StatusTone; readonly badge: string }> = {
  pending: { tone: 'waiting', badge: 'Pending' },
  running: { tone: 'live', badge: 'Running' },
  complete: { tone: 'done', badge: 'Done' },
  failed: { tone: 'failed', badge: 'Failed' },
  escalated: { tone: 'judging', badge: 'Needs you' },
  deferred: { tone: 'waiting', badge: 'Deferred' },
  cancelled: { tone: 'muted', badge: 'Dropped' },
};

/** How long a finished Task ran, such as "3m 12s", or null when it has not finished. */
function duration(task: TaskProgress): string | null {
  if (task.startedAt === null || task.completedAt === null) return null;
  const seconds = Math.max(0, Math.round((Date.parse(task.completedAt) - Date.parse(task.startedAt)) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/** Maps a Task to its card: the skill sets the icon, the status sets the tone and the badge. */
export function presentTask(task: TaskProgress): NodePresentation {
  const skill = SKILLS[task.skillType];
  const status = STATUSES[task.status];
  const took = duration(task);
  const sections = [
    { heading: 'Action', body: task.action },
    ...(task.summary === null ? [] : [{ heading: 'Result', body: task.summary }]),
    ...(task.failureReason === null ? [] : [{ heading: 'Why it stopped', body: task.failureReason }]),
  ];
  return {
    icon: skill.icon,
    title: task.action,
    meta: [`step ${task.sequence}`, skill.label, took].filter((part) => part !== null).join(' · '),
    tone: status.tone,
    badge: status.badge,
    kindLabel: `Task · step ${task.sequence}`,
    sections,
    ...(task.locationPath === null ? {} : { link: task.locationPath }),
  };
}
