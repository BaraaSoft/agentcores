import { PageHeader } from '../../components/page-header/page-header';
import { WorkHubView } from '../../views/workhub/workhub-view';

/** The page that lists every Workflow, lets the owner pause or resume each one, and runs a Strategy again. */
export function WorkHubPage() {
  return (
    <>
      <PageHeader title="WorkHub" />
      <WorkHubView />
    </>
  );
}
