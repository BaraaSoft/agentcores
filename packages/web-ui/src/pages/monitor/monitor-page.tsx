import { PageHeader } from '../../components/page-header/page-header';
import { MonitorBoardView } from '../../views/monitor/monitor-board-view';
import { MonitorStatusView } from '../../views/monitor/monitor-status-view';

/** The live view of the agent's work: a board of the Strategy, its Units of Work, Jobs, and Tasks. */
export function MonitorPage() {
  return (
    <>
      <PageHeader title="Monitor work" trailing={<MonitorStatusView />} />
      <MonitorBoardView />
    </>
  );
}
