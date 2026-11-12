import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Temporary files of the running app, at `~/.agentcores/temp`. The same folder in development and in
 * the published package, so the screenshots never land inside an install folder that npx can clear.
 * `AGENTCORES_HOME` moves it: the CLI passes its own home folder when it starts the backend. It is read
 * when this file loads, so it must be a real environment variable, not a line in `.env`.
 */
export const TEMP_DATA_DIR = join(process.env.AGENTCORES_HOME ?? join(homedir(), '.agentcores'), 'temp');

/** Injection token for the folder `JobScreenshotService` writes to; defaults to `TEMP_DATA_DIR`. */
export const TEMP_DATA_DIR_TOKEN = Symbol('TEMP_DATA_DIR');

/** A Job's screenshots left this long after their last write are deleted by the orchestrator's sweep. */
export const STALE_SCREENSHOT_AGE_MS = 2 * 24 * 60 * 60 * 1000;
