import { registerAs } from '@nestjs/config';

/**
 * The throwaway Postgres database integration specs run against. `pnpm test:integration` points
 * `TEST_DATABASE_URL` at `ahe_test` on the docker-compose Postgres, which must exist.
 */
export const testDatabaseConfig = registerAs('testDatabase', () => ({
  url: process.env.TEST_DATABASE_URL ?? null,
}));

/** Integration specs are skipped when no test database is configured. */
export const describeWithDatabase = testDatabaseConfig().url !== null ? describe : describe.skip;
