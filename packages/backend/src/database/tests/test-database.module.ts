import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { testDatabaseConfig } from './test-database.config';

type Entities = NonNullable<Parameters<typeof TypeOrmModule.forFeature>[0]>;

export interface TestDatabaseOptions {
  /** Postgres schema for this suite, so suites running in parallel never touch each other's tables. */
  readonly schema: string;
  /** Entities to build tables for and expose as repositories. */
  readonly entities: Entities;
}

/**
 * The integration-spec counterpart of `DatabaseModule`: connects to the test database from
 * `testDatabaseConfig`, rebuilds the given entities' tables in the suite's own schema, and exports
 * their repositories so services under test get them through dependency injection.
 * The `vector` extension is created in `public`, where every suite's schema can reach its operators.
 */
@Module({})
export class TestDatabaseModule {
  static register(options: TestDatabaseOptions): DynamicModule {
    const entities = [...options.entities];
    return {
      module: TestDatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule.forFeature(testDatabaseConfig)],
          inject: [testDatabaseConfig.KEY],
          useFactory: (config: ConfigType<typeof testDatabaseConfig>) => {
            if (config.url === null) throw new Error('TEST_DATABASE_URL is not set');
            return { type: 'postgres', url: config.url, schema: options.schema, entities, synchronize: false };
          },
          dataSourceFactory: async (dataSourceOptions?: DataSourceOptions) => {
            const dataSource = await new DataSource(dataSourceOptions!).initialize();
            await dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
            await dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${options.schema}"`);
            await dataSource.synchronize(true);
            return dataSource;
          },
        }),
        TypeOrmModule.forFeature(entities),
      ],
      exports: [TypeOrmModule],
    };
  }
}
