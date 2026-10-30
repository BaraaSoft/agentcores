import type { Query } from 'typeorm/driver/Query';
import type { MigrationFileInput } from './types/migration-file-input';

/** Escapes SQL for a template literal, the same way the TypeORM CLI does. */
function escapeTemplateLiteral(sql: string): string {
  return sql.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function renderQuery(query: Query): string {
  const parameters = query.parameters?.length ? `, ${JSON.stringify(query.parameters)}` : '';
  return `    await queryRunner.query(\`${escapeTemplateLiteral(query.query)}\`${parameters});`;
}

/**
 * Renders a migration class with the same shape as `typeorm migration:generate`,
 * in the repo's code style.
 */
export function renderMigrationFile(input: MigrationFileInput): string {
  return `import { MigrationInterface, QueryRunner } from 'typeorm';

export class ${input.className} implements MigrationInterface {
  name = '${input.className}';

  public async up(queryRunner: QueryRunner): Promise<void> {
${input.upQueries.map(renderQuery).join('\n')}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
${input.downQueries.map(renderQuery).join('\n')}
  }
}
`;
}
