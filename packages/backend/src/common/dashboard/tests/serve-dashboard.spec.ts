import type { NestExpressApplication } from '@nestjs/platform-express';
import { isAbsolute } from 'node:path';
import { serveDashboard } from '../serve-dashboard';

type Middleware = (request: unknown, response: unknown, next: () => void) => void;
type SendFileCallback = (error?: Error) => void;

const DIR = '/Users/someone/.npm/_npx/abc123/node_modules/agentcores/dist/dashboard';

function mount(dir = DIR) {
  const sendFile = jest.fn();
  const destroy = jest.fn();
  const next = jest.fn();
  const response = { sendFile, destroy, headersSent: false };
  let middleware: Middleware = () => {};
  const app = {
    useStaticAssets: jest.fn(),
    use: (handler: Middleware) => (middleware = handler),
  } as unknown as NestExpressApplication;

  serveDashboard(app, dir);
  const request = (path: string, method = 'GET'): void => middleware({ path, method }, response, next);
  /** Replays what Express does when it cannot read the index, for example on a broken install. */
  const failToSend = (): void => (sendFile.mock.calls[0][2] as SendFileCallback)(new Error('Not Found'));
  return { app, request, response, sendFile, destroy, next, failToSend };
}

describe('serveDashboard', () => {
  it('serves the dashboard from the folder it was given', () => {
    const { app } = mount();
    expect(app.useStaticAssets).toHaveBeenCalledWith(DIR);
  });

  it('answers a dashboard route with the index, so a reload of /monitor still works', () => {
    const { request, sendFile, next } = mount();
    request('/monitor');
    expect(sendFile).toHaveBeenCalledWith('index.html', { root: DIR }, expect.any(Function));
    expect(next).not.toHaveBeenCalled();
  });

  /**
   * Express refuses to send a file whose path holds a dotted folder, and `npx` installs the package
   * under `~/.npm/_npx`. An absolute path there answers 404 for every dashboard route.
   */
  it('names the index relative to a root, never as an absolute path', () => {
    const { request, sendFile } = mount();
    request('/monitor');
    const [name, options] = sendFile.mock.calls[0] as [string, { root: string }];
    expect(isAbsolute(name)).toBe(false);
    expect(options.root).toBe(DIR);
  });

  it.each(['/api/workflows', '/api', '/admin/queues', '/admin'])('leaves %s to the backend', (path) => {
    const { request, sendFile, next } = mount();
    request(path);
    expect(sendFile).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it.each(['/apifoo', '/administration'])('treats %s as the dashboard, not the backend', (path) => {
    const { request, sendFile, next } = mount();
    request(path);
    expect(sendFile).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('leaves a request that is not a GET to the backend', () => {
    const { request, sendFile, next } = mount();
    request('/monitor', 'POST');
    expect(sendFile).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('falls through to a plain 404 when the index is missing, instead of raising', () => {
    const { request, next, failToSend } = mount();
    request('/monitor');
    expect(() => failToSend()).not.toThrow();
    expect(next).toHaveBeenCalledWith();
  });

  it('closes the connection when the index fails after the answer started', () => {
    const { request, response, destroy, next, failToSend } = mount();
    request('/monitor');
    response.headersSent = true;
    failToSend();
    expect(destroy).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
