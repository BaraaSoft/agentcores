import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import basicAuth = require('express-basic-auth');
import { AppModule } from './app.module';
import { serveDashboard } from './common/dashboard/serve-dashboard';
import { setupSwagger } from './common/swagger/setup-swagger';

const API_PREFIX = 'api' as const;
const ADMIN_PREFIX = '/admin' as const;
const DEFAULT_PORT = 3088;

/**
 * Starts the AgentCores.AI backend: the control API, the admin tools (Swagger + Bull Board),
 * and the BullMQ workers that plan and run Units, Jobs, and Tasks, all in one process on the Mac Mini.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(
    ADMIN_PREFIX,
    basicAuth({
      users: { [process.env.ADMIN_USERNAME ?? 'admin']: process.env.ADMIN_PASSWORD ?? 'ahe@local' },
      challenge: true,
      realm: 'AgentCores.AI Admin',
    }),
  );
  app.setGlobalPrefix(API_PREFIX, { exclude: ['/admin/*path'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }
  if (process.env.DASHBOARD_DIR) {
    serveDashboard(app, process.env.DASHBOARD_DIR);
  }
  await app.listen(process.env.PORT ?? DEFAULT_PORT);
}

void bootstrap();
