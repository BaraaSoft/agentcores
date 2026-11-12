import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Connects to Postgres. Entities register themselves through each module's
 * `TypeOrmModule.forFeature()`. Schema changes go through `@agentcores/migrations` only.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        // `gen_random_uuid()` for the primary keys. Postgres 13 and newer have it in core, so the
        // backend installs no extension: `@agentcores/migrations` creates `vector`, the only one needed.
        uuidExtension: 'pgcrypto',
        installExtensions: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
