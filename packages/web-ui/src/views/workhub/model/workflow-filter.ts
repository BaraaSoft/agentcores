import type { WorkflowCardData } from '../../../components/workhub-components/workflow-card/workflow-card';

/** Which Workflows the list shows. */
export type WorkflowFilter = 'all' | 'running' | 'paused' | 'done';

/** The cards that match the filter and the search words. The search looks at the Strategy, the objective, and the machine. */
export function filterWorkflowCards(cards: readonly WorkflowCardData[], filter: WorkflowFilter, query: string): WorkflowCardData[] {
  const words = query.trim().toLowerCase();
  return cards.filter(
    (card) =>
      (filter === 'all' || card.state === filter) &&
      (words === '' || `${card.strategyName} ${card.objective} ${card.machineId}`.toLowerCase().includes(words)),
  );
}
