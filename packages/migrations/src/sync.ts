import { writeFileSync } from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import type { SqlInMemory } from 'typeorm/driver/SqlInMemory';
import { AppDataSource } from './data-source';
import { renderMigrationFile } from './render-migration-file';

const MIGRATIONS_DIRECTORY = path.join(__dirname, '../migrations/main');

const MIGRATION_NAME = 'Migration';

/** SQL that loses data. TypeORM writes a rename as a drop and an add, so such a migration waits for review. */
const DESTRUCTIVE_SQL = /\bDROP\s+(COLUMN|TABLE)\b/i;

/** Runs `work` on a fresh connection, so the migration glob is read again and picks up new files. */
async function withDataSource<T>(work: (dataSource: DataSource) => Promise<T>): Promise<T> {
  const dataSource = new DataSource(AppDataSource.options);
  await dataSource.initialize();
  try {
    return await work(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

async function applyPendingMigrations(): Promise<void> {
  const applied = await withDataSource((dataSource) => dataSource.runMigrations({ transaction: 'each' }));
  applied.forEach((migration) => console.log(`Applied ${migration.name}.`));
}

/** Writes the schema difference as a new migration file and returns its path relative to the repo. */
function writeMigrationFile(changes: SqlInMemory): string {
  const timestamp = Date.now();
  const filePath = path.join(MIGRATIONS_DIRECTORY, `${timestamp}-${MIGRATION_NAME}.ts`);
  const content = renderMigrationFile({
    className: `${MIGRATION_NAME}${timestamp}`,
    upQueries: changes.upQueries,
    downQueries: [...changes.downQueries].reverse(),
  });
  writeFileSync(filePath, content);
  return path.relative(path.join(__dirname, '../../..'), filePath);
}

/**
 * Dev only: brings the database in line with the entities, so nobody has to remember to generate a migration.
 * 1. Applies every pending migration.
 * 2. Compares the entities with the database. When they match, it stops.
 * 3. Writes the difference as a new migration file for you to commit.
 * 4. Applies the new file, unless it drops a column or a table. Then it exits with an error and waits for review.
 */
async function syncMigrations(): Promise<void> {
  await applyPendingMigrations();
  const changes = await withDataSource((dataSource) => dataSource.driver.createSchemaBuilder().log());
  if (changes.upQueries.length === 0) {
    console.log('The database schema matches the entities.');
    return;
  }
  const file = writeMigrationFile(changes);
  if (changes.upQueries.some((query) => DESTRUCTIVE_SQL.test(query.query))) {
    console.error(`Generated ${file}. It drops a column or a table, so it was NOT applied.`);
    console.error('Review it: edit a rename into RENAME COLUMN, or delete the file. Then run compose again.');
    process.exitCode = 1;
    return;
  }
  await applyPendingMigrations();
  console.log(`Generated and applied ${file}. Review it and commit it.`);
}

void syncMigrations();
