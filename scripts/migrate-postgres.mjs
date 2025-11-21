#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import postgres from 'postgres';

const RESOLVED_DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://companyintel:companyintel@localhost:5432/companyintel';
const MAX_ATTEMPTS = Number(process.env.DB_WAIT_ATTEMPTS ?? 20);
const WAIT_INTERVAL_MS = Number(process.env.DB_WAIT_INTERVAL_MS ?? 3000);

async function waitForDatabase() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let sql;
    try {
      sql = postgres(RESOLVED_DATABASE_URL, { max: 1 });
      await sql`select 1`;
      await sql.end({ timeout: 1 });
      console.log(`Database ready after ${attempt} attempt(s).`);
      return;
    } catch (error) {
      console.log(`Database not ready (attempt ${attempt}/${MAX_ATTEMPTS}): ${error?.message ?? error}`);
      if (attempt === MAX_ATTEMPTS) {
        throw new Error('Unable to connect to Postgres before timeout.');
      }
      await delay(WAIT_INTERVAL_MS);
    } finally {
      if (sql) {
        try {
          await sql.end({ timeout: 1 });
        } catch {
          // ignore
        }
      }
    }
  }
}

async function runMigrations() {
  await waitForDatabase();
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['db:migrate'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: RESOLVED_DATABASE_URL,
      },
    });
    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pnpm db:migrate exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

runMigrations().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
