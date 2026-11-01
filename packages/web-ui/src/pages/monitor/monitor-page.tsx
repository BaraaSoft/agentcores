import { Activity } from 'lucide-react';
import { EmptyState } from '../../components/empty-state/empty-state';
import { PageHeader } from '../../components/page-header/page-header';

/** The live view of the agent's work. Empty until the status views are built. */
export function MonitorPage() {
  return (
    <>
      <PageHeader title="Monitor work" />
      <EmptyState
        icon={Activity}
        pulsing
        title="Waiting for work"
        description="When a strategy runs, its units, jobs, and tasks appear here as they happen."
      />
    </>
  );
}
