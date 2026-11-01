import { SquarePlus } from 'lucide-react';
import { EmptyState } from '../../components/empty-state/empty-state';
import { PageHeader } from '../../components/page-header/page-header';

/** The page where the owner describes a new strategy. Empty until the form is built. */
export function CreateStrategyPage() {
  return (
    <>
      <PageHeader title="Create strategy" />
      <EmptyState
        icon={SquarePlus}
        title="Start a new strategy"
        description="Describe the goal and the agent plans the work, then carries it out on its own."
      />
    </>
  );
}
