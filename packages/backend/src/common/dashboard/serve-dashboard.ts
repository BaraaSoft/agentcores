import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { isBackendPath } from '../routes.constants';

const INDEX_FILE = 'index.html';

/**
 * Serves the built dashboard from `dir` on the backend's own port, as the `agentcores` CLI runs it.
 * Any other GET gets `index.html`, so the dashboard's own routes, such as `/monitor`, survive a reload.
 */
export function serveDashboard(app: NestExpressApplication, dir: string): void {
  app.useStaticAssets(dir);
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.method !== 'GET' || isBackendPath(request.path)) return next();
    // `root` and a relative name, never an absolute path: Express refuses to send a file whose path
    // holds a dotted folder, and `npx` installs the package under `~/.npm/_npx`.
    response.sendFile(INDEX_FILE, { root: dir }, (error) => {
      if (!error) return;
      // A broken install must answer a plain 404, not raise an unhandled exception with a stack.
      if (response.headersSent) response.destroy();
      else next();
    });
  });
}
