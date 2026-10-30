import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Handwritten, and dated before every generated migration: the Job evaluation search casts to pgvector,
 * and `migration:generate` never emits extensions.
 */
export class EnableVector1730000000000 implements MigrationInterface {
  name = 'EnableVector1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP EXTENSION IF EXISTS vector');
  }
}
