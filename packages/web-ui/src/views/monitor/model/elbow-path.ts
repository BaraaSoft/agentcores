const CORNER_RADIUS = 10;

/** The two ends of a connector: the right edge of the parent card and the left edge of the child. */
interface ElbowEnds {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
}

/**
 * A right-angle connector with rounded corners, from a parent card to a child card. It always uses the
 * same commands, so Framer Motion can morph it when the cards move.
 */
export function elbowPath({ fromX, fromY, toX, toY }: ElbowEnds): { path: string; midX: number } {
  const midX = fromX + (toX - fromX) / 2;
  const dy = toY - fromY;
  const r = Math.min(CORNER_RADIUS, Math.abs(dy) / 2);
  const dir = dy >= 0 ? 1 : -1;
  const path = [
    `M ${fromX} ${fromY}`,
    `H ${midX - r}`,
    `Q ${midX} ${fromY} ${midX} ${fromY + dir * r}`,
    `V ${toY - dir * r}`,
    `Q ${midX} ${toY} ${midX + r} ${toY}`,
    `H ${toX}`,
  ].join(' ');
  return { path, midX };
}
