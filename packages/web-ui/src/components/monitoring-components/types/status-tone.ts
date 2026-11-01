/**
 * How a piece of work looks: `live` runs now, `done` finished well, `failed` stopped badly, `judging` is
 * being marked, `scored` carries a mark, `waiting` has not started, and `muted` will never run.
 */
export type StatusTone = 'live' | 'done' | 'failed' | 'judging' | 'scored' | 'waiting' | 'muted';
