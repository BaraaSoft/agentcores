import pc from 'picocolors';
import { version } from '../package.json';
import { down, init, logs, status, up } from './commands';
import { box, brand, CliError, command } from './ui';

const COMMANDS: Record<string, () => Promise<void> | void> = { init, up, down, status, logs };

const HELP = `${brand()} ${pc.dim(`v${version}`)}  An AI co-worker that runs long work on a real Mac.

Usage: ${command('npx agentcores <command>')}

  ${command('init')}     Check Docker and the macOS permissions, set up the database, and ask for your API key
  ${command('up')}       Start AgentCores.AI in the background, and open the dashboard
  ${command('down')}     Stop AgentCores.AI and its database. Your data stays.
  ${command('status')}   Show what runs
  ${command('logs')}     Follow the backend log

Website: https://agentcores.ai`;

async function main(): Promise<void> {
  const name = process.argv[2];
  if (name === '--version' || name === '-v') return console.log(version);
  const run = name ? COMMANDS[name] : undefined;
  if (!run) {
    console.log(HELP);
    if (name && name !== 'help' && name !== '--help' && name !== '-h') process.exitCode = 1;
    return;
  }
  await run();
}

main().catch((error: unknown) => {
  if (error instanceof CliError) {
    console.error(`\n${box('error', error.title, error.lines)}\n`);
  } else {
    console.error(`\n${box('error', 'Something went wrong', [error instanceof Error ? error.message : String(error)])}\n`);
  }
  process.exit(1);
});
