// Builds the published `agentcores` package into dist/:
//   cli.js         the command, with its prompt libraries inlined
//   backend.js     the backend, with the @agentcores/* packages inlined
//   migrate.js     the migration runner, and migrations/*.js next to it
//   dashboard/     the built dashboard, which the backend serves
//   compose.yaml   Postgres and Redis
// Every other import stays external and installs from npm, so it must be in package.json "dependencies".
// Run `pnpm -r build` first: this script reads the built backend and dashboard.
import { build } from 'esbuild';
import { builtinModules } from 'node:module';
import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = join(ROOT, '..');
const DIST = join(ROOT, 'dist');
const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const dependencies = new Set(Object.keys(manifest.dependencies));
/** Nest and TypeORM load these by name at run time, so no bundle imports them. */
const LOADED_AT_RUNTIME = new Set(['@nestjs/platform-express', 'pg', 'rxjs']);
const builtins = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);

const packageName = (path) => (path.startsWith('@') ? path.split('/').slice(0, 2) : path.split('/').slice(0, 1)).join('/');

/** Keeps every npm package external, except the names that `inline` accepts. */
const externalUnless = (inline) => ({
  name: 'external-packages',
  setup(builder) {
    builder.onResolve({ filter: /^[^./]/ }, (args) => {
      if (builtins.has(args.path) || inline(args.path)) return undefined;
      return { path: args.path, external: true };
    });
  },
});

const shared = { bundle: true, platform: 'node', target: 'node22', format: 'cjs', metafile: true, logLevel: 'warning' };

function ensureFile(path, hint) {
  if (!existsSync(path)) throw new Error(`${path} is missing. ${hint}`);
}

ensureFile(join(PACKAGES, 'backend/dist/main.js'), 'Run `pnpm -r build` first.');
ensureFile(join(PACKAGES, 'web-ui/dist/index.html'), 'Run `pnpm -r build` first.');

rmSync(DIST, { recursive: true, force: true });

const results = await Promise.all([
  build({
    ...shared,
    entryPoints: [join(ROOT, 'src/index.ts')],
    outfile: join(DIST, 'cli.js'),
    banner: { js: '#!/usr/bin/env node' },
    plugins: [externalUnless((path) => path !== 'robotjs')],
  }),
  build({
    ...shared,
    entryPoints: [join(PACKAGES, 'backend/dist/main.js')],
    outfile: join(DIST, 'backend.js'),
    plugins: [externalUnless((path) => path.startsWith('@agentcores/'))],
  }),
  build({
    ...shared,
    entryPoints: [join(ROOT, 'src/runtime/migrate.ts')],
    outfile: join(DIST, 'migrate.js'),
    plugins: [externalUnless(() => false)],
  }),
  build({
    ...shared,
    bundle: false,
    entryPoints: readdirSync(join(PACKAGES, 'migrations/migrations/main'))
      .filter((file) => file.endsWith('.ts'))
      .map((file) => join(PACKAGES, 'migrations/migrations/main', file)),
    outdir: join(DIST, 'migrations'),
  }),
]);

cpSync(join(PACKAGES, 'web-ui/dist'), join(DIST, 'dashboard'), { recursive: true });
cpSync(join(ROOT, 'assets/compose.yaml'), join(DIST, 'compose.yaml'));

const externals = new Set();
for (const { metafile } of results) {
  for (const output of Object.values(metafile.outputs)) {
    for (const entry of output.imports) {
      if (entry.external && !builtins.has(entry.path) && !entry.path.startsWith('.')) externals.add(packageName(entry.path));
    }
  }
}
const undeclared = [...externals].filter((name) => !dependencies.has(name)).sort();
if (undeclared.length > 0) {
  throw new Error(`Add these to "dependencies" in packages/cli/package.json: ${undeclared.join(', ')}`);
}
const unused = [...dependencies].filter((name) => !externals.has(name) && !LOADED_AT_RUNTIME.has(name)).sort();
console.log(`Built dist/ with ${dependencies.size} npm dependencies.`);
if (unused.length > 0) console.warn(`Nothing imports these dependencies, so they may be removable: ${unused.join(', ')}`);
