import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const SWAGGER_PATH = 'admin/docs' as const;

/**
 * Mounts the Swagger UI under `/admin/docs` (protected by the admin basic auth).
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('AgentCores.AI API')
    .setDescription('Control API for AgentCores.AI workflows')
    .setVersion('0.0.1')
    .build();
  SwaggerModule.setup(SWAGGER_PATH, app, SwaggerModule.createDocument(app, config));
}
