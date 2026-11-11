import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

/**
 * Applies the pending migrations that the build copied next to this file, then exits.
 * The CLI runs it as its own process, so the CLI itself never loads TypeORM.
 */
async function main(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    migrations: [join(__dirname, 'migrations', '*.js')],
  });
  await dataSource.initialize();
  const applied = await dataSource.runMigrations();
  await dataSource.destroy();
  console.log(`Applied ${applied.length} migration(s).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
