import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Handwritten: `migration:generate` never emits extensions. Postgres 13 and newer have
 * `gen_random_uuid()` in core, so the primary keys no longer need the `uuid-ossp` extension. A fresh
 * database never had it, and `npx agentcores init` failed on the very first migration.
 *
 * Every table already created with the old default is moved over here, so a database from an earlier
 * version ends up the same as a fresh one.
 */
export class UseGenRandomUuid1794478934034 implements MigrationInterface {
  name = 'UseGenRandomUuid1794478934034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE target record;
      BEGIN
        FOR target IN
          SELECT table_name, column_name FROM information_schema.columns
          WHERE table_schema = current_schema() AND column_default LIKE 'uuid_generate_v4%'
        LOOP
          EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET DEFAULT gen_random_uuid()',
            target.table_name, target.column_name);
        END LOOP;
      END $$;
    `);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      DO $$
      DECLARE target record;
      BEGIN
        FOR target IN
          SELECT table_name, column_name FROM information_schema.columns
          WHERE table_schema = current_schema() AND column_default LIKE 'gen_random_uuid%'
        LOOP
          EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET DEFAULT uuid_generate_v4()',
            target.table_name, target.column_name);
        END LOOP;
      END $$;
    `);
  }
}
