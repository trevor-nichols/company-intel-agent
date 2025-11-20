#!/usr/bin/env node
import { spawn } from 'node:child_process';

const DEFAULT_URL = 'postgres://companyintel:companyintel@localhost:5432/companyintel_test';
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? DEFAULT_URL;

const child = spawn('pnpm', ['test'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    TEST_DATABASE_URL: testDatabaseUrl,
    DATABASE_URL: process.env.DATABASE_URL ?? testDatabaseUrl,
    PERSISTENCE_BACKEND: process.env.PERSISTENCE_BACKEND ?? 'postgres',
    TEST_DATABASE_ALLOW_DROP: process.env.TEST_DATABASE_ALLOW_DROP ?? 'true',
  },
});

child.on('close', code => {
  process.exitCode = code ?? 1;
});

child.on('error', error => {
  console.error(error);
  process.exitCode = 1;
});
