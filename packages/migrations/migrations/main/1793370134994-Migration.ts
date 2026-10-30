import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1793370134994 implements MigrationInterface {
  name = 'Migration1793370134994';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "workflowId" uuid NOT NULL, "jobId" uuid NOT NULL, "action" text NOT NULL, "sequence" integer NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "result" jsonb, "failureReason" text, "locationPath" text, "locationDetails" text, "startedAt" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "reviewedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_ab105ba8cf8f058074ed1b63eb" ON "tasks" ("workflowId", "status") `);
    await queryRunner.query(`CREATE TABLE "jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "unitOfWorkId" uuid NOT NULL, "name" character varying(200) NOT NULL, "objective" text NOT NULL, "orderType" character varying(20) NOT NULL DEFAULT 'unordered', "orderNumber" integer, "outcomeStatus" character varying(20), "outcomeSummary" text, "closedAt" TIMESTAMP WITH TIME ZONE, "reviewingAttempts" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cf0a6c42b72fcc7f7c237def345" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "units_of_work" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "strategyId" uuid NOT NULL, "sequence" integer NOT NULL, "name" character varying(200) NOT NULL, "title" character varying(200) NOT NULL DEFAULT '', "rationale" text NOT NULL DEFAULT '', "status" character varying(20) NOT NULL DEFAULT 'open', "evaluateAfter" TIMESTAMP WITH TIME ZONE, "state" character varying(20) NOT NULL DEFAULT 'running', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_31caef02d313eeb9115189e6566" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d0cc5dd155b72fb5d64113db2c" ON "units_of_work" ("strategyId", "sequence") `);
    await queryRunner.query(`CREATE TABLE "strategies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner" character varying(100) NOT NULL, "name" character varying(200) NOT NULL, "objective" text NOT NULL, "workType" character varying(20) NOT NULL, "versionCount" integer, "maxAttempts" integer NOT NULL DEFAULT '3', "status" character varying(20) NOT NULL DEFAULT 'active', "startDate" TIMESTAMP WITH TIME ZONE NOT NULL, "endDate" TIMESTAMP WITH TIME ZONE, "goldStandards" jsonb, "evaluation" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9a0d363ddf5b40d080147363238" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_262b47c81b77ceca19f2192103" ON "strategies" ("owner", "startDate") `);
    await queryRunner.query(`CREATE TABLE "workflows" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "strategyId" uuid NOT NULL, "machineId" character varying(100) NOT NULL, "resources" jsonb NOT NULL, "state" character varying(20) NOT NULL DEFAULT 'paused', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5b5757cc1cd86268019fef52e0c" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8564cf8500e556d129ed25abd2" ON "workflows" ("strategyId", "machineId") `);
    await queryRunner.query(`CREATE TABLE "platform_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "workflowId" uuid NOT NULL, "platform" character varying(100) NOT NULL, "username" character varying(200) NOT NULL, "secretRef" character varying(300) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3ee99dfeb0ac9a79b966cc296f9" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_4b1425202c1553452481434d49" ON "platform_accounts" ("workflowId", "platform") `);
    await queryRunner.query(`CREATE TABLE "daily_reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "workflowId" uuid NOT NULL, "reportDate" date NOT NULL, "summary" text NOT NULL, "unitMeasurements" jsonb NOT NULL, "tasksCompleted" integer NOT NULL, "tasksFailed" integer NOT NULL, "openEscalations" integer NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9c061cec58b95e2cc8ed285db09" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_012d5cde5f41a5ac0f3c807f45" ON "daily_reports" ("workflowId", "reportDate") `);
    await queryRunner.query(`CREATE TABLE "account_challenges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "accountId" uuid NOT NULL, "taskId" uuid, "kind" character varying(30) NOT NULL, "detail" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2bc3f497ad34318a403e6c12ef4" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_e28cdbd59c72f12c2c564767c9" ON "account_challenges" ("accountId", "createdAt") `);
    await queryRunner.query(`CREATE TABLE "escalations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "workflowId" uuid NOT NULL, "taskId" uuid, "question" text NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'open', "ownerNote" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "resolvedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_652a394609addaa4b0f2b3032a1" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_8b9142885a99ad594229096e55" ON "escalations" ("workflowId", "status") `);
    await queryRunner.query(`CREATE TABLE "job_evaluations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner" character varying(100) NOT NULL, "jobId" uuid NOT NULL, "unitOfWorkId" uuid NOT NULL, "state" character varying(20) NOT NULL DEFAULT 'evaluating', "score" integer, "objectiveSummary" text NOT NULL DEFAULT '', "objectiveEmbedding" real array, "whatGood" text NOT NULL DEFAULT '', "whatBad" text NOT NULL DEFAULT '', "rubric" text NOT NULL DEFAULT '', "evidenceJobId" uuid, "attempts" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4d4d363bcdb00fe329a795a1e0a" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_106e5105041940e746a024e677" ON "job_evaluations" ("owner", "state") `);
    await queryRunner.query(`CREATE INDEX "IDX_1f0a7c949ed7aa53cfaa0bdc23" ON "job_evaluations" ("unitOfWorkId", "state") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3530a1fbdbbd77de1a563d4f9a" ON "job_evaluations" ("jobId") `);
    await queryRunner.query(`CREATE TABLE "metric_snapshots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "unitOfWorkId" uuid NOT NULL, "taskId" uuid, "metricKey" character varying(100) NOT NULL, "value" double precision NOT NULL, "capturedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e7df991ed7476a98b561fc45083" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_13df8dd1f2c4f832dcff8c8df6" ON "metric_snapshots" ("unitOfWorkId", "metricKey", "capturedAt") `);
    await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_f215ca000db56953a67baa23034" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "jobs" ADD CONSTRAINT "FK_585bf7ea66fd6a0545533169d29" FOREIGN KEY ("unitOfWorkId") REFERENCES "units_of_work"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "units_of_work" ADD CONSTRAINT "FK_dfe14571da4221dfdab535e3c07" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "workflows" ADD CONSTRAINT "FK_ef19473629c8faee958d6fdf1e0" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "job_evaluations" ADD CONSTRAINT "FK_3530a1fbdbbd77de1a563d4f9a9" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_evaluations" DROP CONSTRAINT "FK_3530a1fbdbbd77de1a563d4f9a9"`);
    await queryRunner.query(`ALTER TABLE "workflows" DROP CONSTRAINT "FK_ef19473629c8faee958d6fdf1e0"`);
    await queryRunner.query(`ALTER TABLE "units_of_work" DROP CONSTRAINT "FK_dfe14571da4221dfdab535e3c07"`);
    await queryRunner.query(`ALTER TABLE "jobs" DROP CONSTRAINT "FK_585bf7ea66fd6a0545533169d29"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_f215ca000db56953a67baa23034"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_13df8dd1f2c4f832dcff8c8df6"`);
    await queryRunner.query(`DROP TABLE "metric_snapshots"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3530a1fbdbbd77de1a563d4f9a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1f0a7c949ed7aa53cfaa0bdc23"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_106e5105041940e746a024e677"`);
    await queryRunner.query(`DROP TABLE "job_evaluations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8b9142885a99ad594229096e55"`);
    await queryRunner.query(`DROP TABLE "escalations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e28cdbd59c72f12c2c564767c9"`);
    await queryRunner.query(`DROP TABLE "account_challenges"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_012d5cde5f41a5ac0f3c807f45"`);
    await queryRunner.query(`DROP TABLE "daily_reports"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4b1425202c1553452481434d49"`);
    await queryRunner.query(`DROP TABLE "platform_accounts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8564cf8500e556d129ed25abd2"`);
    await queryRunner.query(`DROP TABLE "workflows"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_262b47c81b77ceca19f2192103"`);
    await queryRunner.query(`DROP TABLE "strategies"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d0cc5dd155b72fb5d64113db2c"`);
    await queryRunner.query(`DROP TABLE "units_of_work"`);
    await queryRunner.query(`DROP TABLE "jobs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ab105ba8cf8f058074ed1b63eb"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
  }
}
