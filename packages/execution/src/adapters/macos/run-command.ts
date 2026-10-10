import { spawn } from 'node:child_process';

/**
 * Runs a command-line tool without a shell, optionally piping `input` to its stdin.
 * Resolves with stdout; rejects with the exit code and stderr if it fails.
 */
export function runCommand(command: string, args: readonly string[], input?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout));
      } else {
        reject(new Error(`${command} exited with code ${code}: ${Buffer.concat(stderr).toString().trim()}`));
      }
    });

    child.stdin.end(input);
  });
}
