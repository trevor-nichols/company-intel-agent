import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './database/migrations',
  schema: './database/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://companyintel:companyintel@localhost:5432/companyintel',
  },
  casing: 'snake_case',
});
