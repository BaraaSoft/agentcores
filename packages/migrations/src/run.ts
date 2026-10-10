import { AppDataSource } from './data-source';

/**
 * Applies all pending migrations to the main database, then exits.
 */
async function runMigrations(): Promise<void> {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  await AppDataSource.destroy();
}

void runMigrations();
