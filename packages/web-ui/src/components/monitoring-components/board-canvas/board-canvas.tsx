import styled from '@emotion/styled';
import type { ReactNode } from 'react';

/** The layers of the board, drawn back to front: lanes, edges (SVG), then cards and labels. */
export interface BoardCanvasProps {
  readonly width: number;
  readonly height: number;
  readonly lanes: ReactNode;
  readonly edges: ReactNode;
  readonly nodes: ReactNode;
  readonly label: string;
}

const PADDING = 28;

const Scroller = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  background-image: radial-gradient(${({ theme }) => theme.color.grid} 1px, transparent 1px);
  background-size: 18px 18px;
  background-attachment: local;
`;

const Stage = styled.div`
  position: relative;
  height: calc(100% - ${PADDING * 2}px);
  margin: ${PADDING}px;
`;

const Edges = styled.svg`
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
`;

/** A scrollable, dotted canvas that holds the lanes, the edges, and the cards. It fills at least the visible area. */
export function BoardCanvas({ width, height, lanes, edges, nodes, label }: BoardCanvasProps) {
  return (
    <Scroller role="region" aria-label={label}>
      <Stage style={{ width, minHeight: height }}>
        {lanes}
        <Edges width={width} height={height} aria-hidden>
          {edges}
        </Edges>
        {nodes}
      </Stage>
    </Scroller>
  );
}
