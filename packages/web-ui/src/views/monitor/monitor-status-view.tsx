import { LiveIndicator } from '../../components/monitoring-components/live-indicator/live-indicator';
import { useMonitorStore } from '../../state/monitor-store';

/** The live pill in the Monitor header: it says whether the agent answers, and whether its Workflow runs. */
export function MonitorStatusView() {
  const connection = useMonitorStore((state) => state.connection);
  const workflowState = useMonitorStore((state) => state.progress?.workflowState ?? null);
  if (connection === 'offline') return <LiveIndicator state="offline" label="Offline" />;
  if (connection === 'connecting') return <LiveIndicator state="connecting" label="Connecting" />;
  if (workflowState === 'paused') return <LiveIndicator state="paused" label="Paused" />;
  return <LiveIndicator state="live" label="Live" detail={workflowState === null ? 'no work yet' : 'every 2s'} />;
}
