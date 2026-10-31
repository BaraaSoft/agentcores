import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1793438162496 implements MigrationInterface {
  name = 'Migration1793438162496';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" ADD "skillType" character varying(30) NOT NULL DEFAULT 'general'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "skillType"`);
  }
}
