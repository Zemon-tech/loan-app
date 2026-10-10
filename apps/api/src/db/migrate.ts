/**
 * Programmatic migration runner for the app-owned `mobile_app` schema.
 *
 * Used instead of the knex CLI because, in an npm-workspaces monorepo, the knex binary is
 * hoisted to the repo-root node_modules and the local bin path is unreliable. The programmatic
 * API resolves knex via normal module resolution, so it works the same in dev, CI, and Docker.
 *
 * Usage (via package.json scripts):
 *   tsx src/db/migrate.ts latest      # apply all pending migrations
 *   tsx src/db/migrate.ts rollback    # roll back the last batch
 *   tsx src/db/migrate.ts status      # list completed + pending
 *   tsx src/db/migrate.ts make <name> # create a new timestamped migration (.ts)
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import knexFactory from 'knex';
import { loadEnv } from '../config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, 'migrations');

const env = loadEnv();

const db = knexFactory({
  client: 'mysql2',
  connection: {
    host: env.APP_DB_HOST,
    port: env.APP_DB_PORT,
    // Migrations need DDL, so prefer the migrator credential; fall back to the app user in dev.
    user: env.APP_DB_MIGRATOR_USER ?? env.APP_DB_USER,
    password: env.APP_DB_MIGRATOR_PASSWORD ?? env.APP_DB_PASSWORD,
    database: env.APP_DB_NAME,
  },
  migrations: {
    directory: migrationsDir,
    tableName: 'knex_migrations',
    loadExtensions: ['.ts'],
  },
});

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'latest';

  switch (command) {
    case 'latest': {
      const [batch, log] = await db.migrate.latest();
      if (log.length === 0) {
        console.log('Already up to date — no migrations to run.');
      } else {
        console.log(`Batch ${batch} ran ${log.length} migration(s):`);
        for (const name of log) console.log(`  ↑ ${name}`);
      }
      break;
    }
    case 'rollback': {
      const [batch, log] = await db.migrate.rollback();
      if (log.length === 0) {
        console.log('Nothing to roll back.');
      } else {
        console.log(`Rolled back batch ${batch} (${log.length} migration(s)):`);
        for (const name of log) console.log(`  ↓ ${name}`);
      }
      break;
    }
    case 'status': {
      const [completed, pending] = await Promise.all([
        db.migrate.list().then(([done]) => done as Array<{ name: string }>),
        db.migrate.list().then(([, todo]) => todo as Array<{ file: string }>),
      ]);
      console.log(`Completed (${completed.length}):`);
      for (const m of completed) console.log(`  ✓ ${m.name}`);
      console.log(`Pending (${pending.length}):`);
      for (const m of pending) console.log(`  • ${m.file}`);
      break;
    }
    case 'make': {
      const name = process.argv[3];
      if (!name) throw new Error('Usage: migrate.ts make <name>');
      const file = await db.migrate.make(name, { directory: migrationsDir, extension: 'ts' });
      console.log(`Created migration: ${file}`);
      break;
    }
    default:
      throw new Error(`Unknown command "${command}". Use: latest | rollback | status | make <name>`);
  }
}

main()
  .then(() => db.destroy())
  .catch(async (err) => {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    await db.destroy();
    process.exit(1);
  });
