import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

/**
 * Entities are read straight from the backend source tree so the TypeORM CLI can diff
 * them against the live schema when generating migrations.
 */
const ENTITY_GLOB = path.join(__dirname, '../../backend/src/**/*.entity.ts');

const MIGRATION_GLOB = path.join(__dirname, '../migrations/main/*.ts');

/**
 * The main AgentCores.AI database. Used by the TypeORM CLI (`migration:generate`, `migration:run`)
 * and by `run.ts` at deploy time.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [ENTITY_GLOB],
  migrations: [MIGRATION_GLOB],
});
