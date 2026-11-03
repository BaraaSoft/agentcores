import type { LucideIcon } from 'lucide-react';
import type { InspectorSection } from '../../../components/monitoring-components/types/inspector-section';
import type { StatusTone } from '../../../components/monitoring-components/types/status-tone';

/** How one piece of work looks on its card and in the inspector, before it is placed. */
export interface NodePresentation {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly meta: string;
  readonly tone: StatusTone;
  readonly badge: string;
  readonly score?: string;
  readonly progress?: { readonly done: number; readonly total: number };
  readonly kindLabel: string;
  readonly sections: readonly InspectorSection[];
  readonly link?: string;
}
