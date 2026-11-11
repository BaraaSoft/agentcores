import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';

const BACKEND_PREFIXES = ['/api', '/admin'] as const;

/**
 * Serves the built dashboard from `dir` on the backend's own port, as the `agentcores` CLI runs it.
 * Any other GET gets `index.html`, so the dashboard's own routes, such as `/monitor`, survive a reload.
 */
export function serveDashboard(app: NestExpressApplication, dir: string): void {
  const index = join(dir, 'index.html');
  app.useStaticAssets(dir);
  app.use((request: Request, response: Response, next: NextFunction) => {
    const isBackendRoute = BACKEND_PREFIXES.some((prefix) => request.path.startsWith(prefix));
    if (request.method !== 'GET' || isBackendRoute) return next();
    response.sendFile(index);
  });
}
