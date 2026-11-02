import { PageHeader } from '../../components/page-header/page-header';
import { CreateStrategyView } from '../../views/create-strategy/create-strategy-view';

/** The page where the owner describes a new strategy and launches it. */
export function CreateStrategyPage() {
  return (
    <>
      <PageHeader title="Create strategy" />
      <CreateStrategyView />
    </>
  );
}
