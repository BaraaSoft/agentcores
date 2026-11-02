import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A Strategy becomes a reusable goal and each Workflow becomes one run of it. Units of Work move from
 * the Strategy to the Workflow, a finished run is a `done` Workflow, and the Strategy's own
 * `status` and `endDate` go away.
 */
export class Migration1793608360774 implements MigrationInterface {
  name = 'Migration1793608360774';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_d0cc5dd155b72fb5d64113db2c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8564cf8500e556d129ed25abd2"`);
    await queryRunner.query(`ALTER TABLE "units_of_work" ADD "workflowId" uuid`);
    await queryRunner.query(
      `INSERT INTO "workflows" ("strategyId", "machineId", "resources", "state") SELECT DISTINCT "unit"."strategyId", 'Macbook', '{"maxConcurrentJobs":1,"budgetLimit":50}'::jsonb, 'paused' FROM "units_of_work" "unit" WHERE NOT EXISTS (SELECT 1 FROM "workflows" "workflow" WHERE "workflow"."strategyId" = "unit"."strategyId")`,
    );
    await queryRunner.query(
      `UPDATE "units_of_work" "unit" SET "workflowId" = (SELECT "workflow"."id" FROM "workflows" "workflow" WHERE "workflow"."strategyId" = "unit"."strategyId" ORDER BY "workflow"."createdAt" ASC LIMIT 1)`,
    );
    await queryRunner.query(`ALTER TABLE "units_of_work" ALTER COLUMN "workflowId" SET NOT NULL`);
    await queryRunner.query(
      `UPDATE "workflows" SET "state" = 'done' WHERE "strategyId" IN (SELECT "id" FROM "strategies" WHERE "status" = 'complete')`,
    );
    await queryRunner.query(`ALTER TABLE "strategies" DROP COLUMN "status"`);
    await queryRunner.query(`ALTER TABLE "strategies" DROP COLUMN "endDate"`);
    await queryRunner.query(`CREATE INDEX "IDX_dfe14571da4221dfdab535e3c0" ON "units_of_work" ("strategyId") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ad510c4ac92f9bc3ec282d74ae" ON "units_of_work" ("workflowId", "sequence") `);
    await queryRunner.query(
      `ALTER TABLE "units_of_work" ADD CONSTRAINT "FK_541e20b2552e68e0c9f268b62ea" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  /** Fails on the old unique indexes once a Strategy has had more than one run. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "units_of_work" DROP CONSTRAINT "FK_541e20b2552e68e0c9f268b62ea"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ad510c4ac92f9bc3ec282d74ae"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dfe14571da4221dfdab535e3c0"`);
    await queryRunner.query(`ALTER TABLE "units_of_work" DROP COLUMN "workflowId"`);
    await queryRunner.query(`ALTER TABLE "strategies" ADD "endDate" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "strategies" ADD "status" character varying(20) NOT NULL DEFAULT 'active'`);
    await queryRunner.query(
      `UPDATE "strategies" SET "status" = 'complete', "endDate" = now() WHERE "id" IN (SELECT "strategyId" FROM "workflows" WHERE "state" = 'done')`,
    );
    await queryRunner.query(`UPDATE "workflows" SET "state" = 'paused' WHERE "state" = 'done'`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8564cf8500e556d129ed25abd2" ON "workflows" ("strategyId", "machineId") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d0cc5dd155b72fb5d64113db2c" ON "units_of_work" ("strategyId", "sequence") `);
  }
}
