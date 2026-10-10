import { randomInt } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { FixtureCodes } from './fixture-codes';
import { buildFixturePages } from './fixture-pages';

/**
 * A local web server for the end-to-end tests. Pages hide random codes, and form posts are recorded,
 * so a test can check what actually happened in the browser rather than trusting the model's summary.
 */
export class FixtureServer {
  readonly messages: string[] = [];
  readonly logins: { username: string; password: string }[] = [];
  isGatePassed = false;

  private constructor(
    private readonly server: Server,
    readonly codes: FixtureCodes,
  ) {}

  /** Starts on a free port on 127.0.0.1. */
  static async start(): Promise<FixtureServer> {
    const codes: FixtureCodes = {
      heading: String(randomInt(1000, 10000)),
      scroll: `MARIGOLD-${randomInt(100, 1000)}`,
      zoom: `RX-${randomInt(10000, 100000)}`,
      inboxCount: randomInt(2, 10),
      password: `fixture-${randomInt(100000, 1000000)}`,
    };
    const server = createServer();
    const fixture = new FixtureServer(server, codes);
    server.on('request', (request, response) => void fixture.handle(request, response));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    return fixture;
  }

  /** `host:port`, e.g. for the credentials' `platform`. */
  get host(): string {
    const { port } = this.server.address() as AddressInfo;
    return `127.0.0.1:${port}`;
  }

  url(path: string): string {
    return `http://${this.host}${path}`;
  }

  close(): Promise<void> {
    this.server.closeAllConnections();
    return new Promise((resolve, reject) => this.server.close((error) => (error ? reject(error) : resolve())));
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const pages = buildFixturePages(this.codes);
    const path = new URL(request.url ?? '/', 'http://fixture').pathname;

    if (request.method === 'GET' && path in pages) {
      this.send(response, 200, pages[path]);
      return;
    }
    if (request.method !== 'POST') {
      this.send(response, 404, '<h1>Not found</h1>');
      return;
    }

    const form = new URLSearchParams(await this.readBody(request));
    switch (path) {
      case '/echo':
        this.messages.push(form.get('message') ?? '');
        this.send(response, 200, '<h1>Message sent</h1>');
        return;
      case '/verified':
        this.isGatePassed = true;
        this.send(response, 200, '<h1>Thanks! Continuing to the article…</h1>');
        return;
      case '/login': {
        const login = { username: form.get('username') ?? '', password: form.get('password') ?? '' };
        this.logins.push(login);
        if (login.username === 'ahe_bot' && login.password === this.codes.password) {
          this.send(response, 200, pages['/inbox']);
        } else {
          this.send(response, 401, `${pages['/login']}<p style="color: red">Wrong username or password.</p>`);
        }
        return;
      }
      default:
        this.send(response, 404, '<h1>Not found</h1>');
    }
  }

  private readBody(request: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      request.on('error', reject);
    });
  }

  private send(response: ServerResponse, status: number, html: string): void {
    response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(html);
  }
}
