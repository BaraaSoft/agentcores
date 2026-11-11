import * as robot from 'robotjs';
import { openUrl } from './shell';
import { CliError, command } from './ui';

const SETTINGS = {
  accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
  screenRecording: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
} as const;

const TERMINALS: Record<string, string> = {
  Apple_Terminal: 'Terminal',
  'iTerm.app': 'iTerm',
  vscode: 'Cursor (or VS Code)',
  WarpTerminal: 'Warp',
  ghostty: 'Ghostty',
  WezTerm: 'WezTerm',
  Hyper: 'Hyper',
};

/** macOS gives the permissions to the app that runs this command, so the messages name that app. */
export function terminalName(): string {
  return TERMINALS[process.env.TERM_PROGRAM ?? ''] ?? 'your terminal app';
}

interface Permissions {
  readonly accessibility: boolean;
  readonly screenRecording: boolean;
}

function read(prompt: boolean): Permissions {
  if (prompt) {
    return {
      accessibility: robot.requestAccessibilityPermission() !== false,
      screenRecording: robot.requestScreenCapturePermission() !== false,
    };
  }
  return {
    accessibility: robot.getAccessibilityPermission() !== false,
    screenRecording: robot.getScreenCapturePermission() !== false,
  };
}

/**
 * Checks Accessibility (mouse and keyboard) and Screen Recording once. `init` also shows the macOS prompts.
 * When one is missing, it opens the System Settings page and stops with a box; the user runs the command again.
 */
export function ensurePermissions(options: { prompt: boolean; retry: string }): void {
  const granted = read(options.prompt);
  if (granted.accessibility && granted.screenRecording) return;

  const app = terminalName();
  const names: string[] = [];
  if (!granted.accessibility) {
    names.push('Accessibility');
    openUrl(SETTINGS.accessibility);
  }
  if (!granted.screenRecording) {
    names.push('Screen Recording');
    openUrl(SETTINGS.screenRecording);
  }

  throw new CliError(`macOS has not given ${app} control of this Mac`, [
    `AgentCores.AI uses the mouse, the keyboard, and the screen, like a person.`,
    `It needs ${names.join(' and ')}. I opened System Settings for you.`,
    '',
    `1. In System Settings > Privacy & Security > ${names.join(' and ')},`,
    `   turn on ${app}.`,
    ...(granted.screenRecording ? [] : [`2. Quit ${app} completely (Cmd+Q), and open it again.`]),
    `${granted.screenRecording ? '2' : '3'}. Run ${command(options.retry)} again.`,
  ]);
}
