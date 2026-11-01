import styled from '@emotion/styled';
import { Activity, PlugZap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../../components/empty-state/empty-state';
import { BoardCanvas } from '../../components/monitoring-components/board-canvas/board-canvas';
import { BoardLane } from '../../components/monitoring-components/board-lane/board-lane';
import { EdgeLabel } from '../../components/monitoring-components/edge-label/edge-label';
import { FlowEdge } from '../../components/monitoring-components/flow-edge/flow-edge';
import { NodeCard } from '../../components/monitoring-components/node-card/node-card';
import { NodeInspector } from '../../components/monitoring-components/node-inspector/node-inspector';
import { StatStrip } from '../../components/monitoring-components/stat-strip/stat-strip';
import { useMonitorStore } from '../../state/monitor-store';
import { boardStats } from './model/board-stats';
import { buildBoard } from './model/build-board';

const Frame = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

/** The live board of the agent's work: it polls the store, lays the work out, and shows the details of a selected card. */
export function MonitorBoardView() {
  const startPolling = useMonitorStore((state) => state.startPolling);
  const connection = useMonitorStore((state) => state.connection);
  const progress = useMonitorStore((state) => state.progress);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => startPolling(), [startPolling]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setSelectedId(null);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);
  const board = useMemo(() => (progress === null ? null : buildBoard(progress)), [progress]);
  const stats = useMemo(() => (progress === null ? null : boardStats(progress)), [progress]);
  if (board === null || stats === null) {
    if (connection === 'offline') {
      return (
        <EmptyState
          icon={PlugZap}
          title="The agent is offline"
          description="Start the backend with pnpm dev. The board connects by itself as soon as the agent answers."
        />
      );
    }
    return (
      <EmptyState
        icon={Activity}
        pulsing
        title={connection === 'connecting' ? 'Connecting to the agent' : 'Waiting for work'}
        description="When a strategy runs, its units, jobs, and tasks appear here as they happen."
      />
    );
  }
  const selected = board.nodes.find((node) => node.id === selectedId) ?? null;
  return (
    <Frame>
      <StatStrip hero={stats.hero} metrics={stats.metrics} />
      <BoardCanvas
        label="Work board"
        width={board.width}
        height={board.height}
        lanes={board.lanes.map((lane) => (
          <BoardLane key={lane.id} label={lane.label} count={lane.count} x={lane.x} width={lane.width} />
        ))}
        edges={board.edges.map((edge) => (
          <FlowEdge key={edge.id} path={edge.path} tone={edge.tone} />
        ))}
        nodes={
          <>
            {board.nodes.map((node) => (
              <NodeCard
                key={node.id}
                icon={node.icon}
                title={node.title}
                meta={node.meta}
                tone={node.tone}
                badge={node.badge}
                {...(node.score === undefined ? {} : { score: node.score })}
                {...(node.progress === undefined ? {} : { progress: node.progress })}
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                selected={node.id === selectedId}
                onSelect={() => setSelectedId(node.id === selectedId ? null : node.id)}
              />
            ))}
            {board.edges.flatMap((edge) =>
              edge.label === undefined ? [] : [<EdgeLabel key={`${edge.id}:label`} label={edge.label.text} tone={edge.tone} x={edge.label.x} y={edge.label.y} />],
            )}
          </>
        }
      />
      <NodeInspector
        node={
          selected === null
            ? null
            : {
                id: selected.id,
                kind: selected.kindLabel,
                title: selected.title,
                badge: selected.badge,
                tone: selected.tone,
                ...(selected.score === undefined ? {} : { score: selected.score }),
                sections: selected.sections,
                ...(selected.link === undefined ? {} : { link: selected.link }),
              }
        }
        onClose={() => setSelectedId(null)}
      />
    </Frame>
  );
}
