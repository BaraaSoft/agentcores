import colors from 'picocolors';
import qrcode from 'qrcode-terminal';
import type { Plugin, ViteDevServer } from 'vite';

/** Options for {@link networkBanner}. */
export interface NetworkBannerOptions {
  readonly title: string;
  readonly path: string;
}

const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;
const LABEL_WIDTH = 10;

/** Paints text in a 24-bit colour when the terminal supports colour. */
function truecolor(red: number, green: number, blue: number): (text: string) => string {
  return (text) => (colors.isColorSupported ? `\x1b[38;2;${red};${green};${blue}m${text}\x1b[39m` : text);
}

const metaBlue = truecolor(0, 129, 251);
const liveGreen = truecolor(76, 183, 130);

/** The width of a line as the terminal shows it, without colour codes. */
function visibleWidth(line: string): number {
  return line.replace(ANSI_PATTERN, '').length;
}

/** Draws rounded box lines around the given rows. */
function frame(rows: readonly string[]): string[] {
  const width = Math.max(...rows.map(visibleWidth)) + 4;
  const edge = (left: string, right: string) => colors.dim(`${left}${'─'.repeat(width)}${right}`);
  const body = rows.map((row) => `${colors.dim('│')}  ${row}${' '.repeat(width - 2 - visibleWidth(row))}${colors.dim('│')}`);
  return [edge('╭', '╮'), ...body, edge('╰', '╯')];
}

/** One "Label   url" row of the banner. */
function urlRow(label: string, url: string): string {
  return `${colors.dim(label.padEnd(LABEL_WIDTH))}${colors.bold(metaBlue(url))}`;
}

/** Renders a QR code of the URL as indented terminal lines. */
function qrLines(url: string): string[] {
  let output = '';
  qrcode.generate(url, { small: true }, (code) => {
    output = code;
  });
  return output.split('\n').map((line) => `  ${line}`);
}

/** Builds the banner: the title, the local and network URLs, and a QR code of the first network URL. */
function bannerLines(server: ViteDevServer, options: NetworkBannerOptions): string[] {
  const route = options.path.replace(/^\//, '');
  const local = (server.resolvedUrls?.local ?? []).map((url) => `${url}${route}`);
  const network = (server.resolvedUrls?.network ?? []).map((url) => `${url}${route}`);
  const rows = [
    `${liveGreen('●')} ${colors.bold(options.title)}  ${colors.dim('is live')}`,
    '',
    ...local.map((url) => urlRow('Local', url)),
    ...(network.length === 0 ? [`${colors.dim('Network'.padEnd(LABEL_WIDTH))}${colors.yellow('not on a network')}`] : network.map((url) => urlRow('Network', url))),
  ];
  const firstNetwork = network[0];
  if (firstNetwork === undefined) return ['', ...frame(rows), ''];
  return ['', ...frame([...rows, '', colors.dim('Scan with your phone to watch the agent from another device.')]), ...qrLines(firstNetwork), ''];
}

/** Replaces Vite's start-up URL list with a framed banner and a QR code, so another device can open the dashboard. */
export function networkBanner(options: NetworkBannerOptions): Plugin {
  return {
    name: 'ahe-network-banner',
    apply: 'serve',
    configureServer(server) {
      server.printUrls = () => {
        console.log(bannerLines(server, options).join('\n'));
      };
    },
  };
}
