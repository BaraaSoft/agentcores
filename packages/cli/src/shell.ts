import { spawn, spawnSync } from 'node:child_process';

export interface RunResult {
  readonly ok: boolean;
  readonly output: string;
}

/** Runs a command to the end and keeps its stdout and stderr together, for the error box. */
export function run(file: string, args: readonly string[], env?: NodeJS.ProcessEnv): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(file, args, { env: env ?? process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.on('error', (error) => resolve({ ok: false, output: error.message }));
    child.on('close', (code) => resolve({ ok: code === 0, output }));
  });
}

export function succeeds(file: string, args: readonly string[]): boolean {
  return spawnSync(file, args, { stdio: 'ignore' }).status === 0;
}

/** The last lines of a command's output, for an error box. */
export function lastLines(text: string, count = 8): string[] {
  return text.trimEnd().split('\n').slice(-count);
}

export function openUrl(url: string): void {
  spawnSync('open', [url], { stdio: 'ignore' });
}
