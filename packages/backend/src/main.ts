import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import basicAuth = require('express-basic-auth');
import { AppModule } from './app.module';
import { setupSwagger } from './common/swagger/setup-swagger';

const API_PREFIX = 'api' as const;
const ADMIN_PREFIX = '/admin' as const;
const DEFAULT_PORT = 3088;

/**
 * Starts the AHE backend: the control API, the admin tools (Swagger + Bull Board),
 * and the BullMQ workers that plan and run Units, Jobs, and Tasks, all in one process on the Mac Mini.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use(
    ADMIN_PREFIX,
    basicAuth({
      users: { [process.env.ADMIN_USERNAME ?? 'admin']: process.env.ADMIN_PASSWORD ?? 'ahe@local' },
      challenge: true,
      realm: 'AHE Admin',
    }),
  );
  app.setGlobalPrefix(API_PREFIX, { exclude: ['/admin/*path'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }
  await app.listen(process.env.PORT ?? DEFAULT_PORT);
}

void bootstrap();
