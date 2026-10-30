import type { Query } from 'typeorm/driver/Query';

/** What `renderMigrationFile` needs to write one migration class. */
export interface MigrationFileInput {
  /** Class name; TypeORM requires it to end with the migration's timestamp. */
  readonly className: string;
  readonly upQueries: readonly Query[];
  /** Already in the order they must run: the reverse of the up queries. */
  readonly downQueries: readonly Query[];
}
