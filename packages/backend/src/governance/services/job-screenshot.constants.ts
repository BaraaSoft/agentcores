import { resolve } from 'node:path';

/**
 * Temporary files of the running app, at `.data/temp` in the repository root. The same five levels up
 * from `src/governance/services` and `dist/governance/services` reach the root. Git ignores `.data/`.
 */
export const TEMP_DATA_DIR = resolve(__dirname, '../../../../../.data/temp');

/** Injection token for the folder `JobScreenshotService` writes to; defaults to `TEMP_DATA_DIR`. */
export const TEMP_DATA_DIR_TOKEN = Symbol('TEMP_DATA_DIR');

/** A Job's screenshots left this long after their last write are deleted by the orchestrator's sweep. */
export const STALE_SCREENSHOT_AGE_MS = 2 * 24 * 60 * 60 * 1000;
