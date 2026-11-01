import type { StatusTone } from '../../../components/monitoring-components/types/status-tone';
import type { NodePresentation } from './node-presentation';

/** The whole board, ready to draw: every lane, card, and edge at its position, and the stage size. */
export interface Board {
  readonly width: number;
  readonly height: number;
  readonly lanes: readonly { readonly id: string; readonly label: string; readonly count: number; readonly x: number; readonly width: number }[];
  readonly nodes: readonly (NodePresentation & {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  })[];
  readonly edges: readonly {
    readonly id: string;
    readonly path: string;
    readonly tone: StatusTone;
    readonly label?: { readonly text: string; readonly x: number; readonly y: number };
  }[];
}
