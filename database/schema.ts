import { sql } from 'drizzle-orm';
import {
  pgEnum,
  pgTable,
  serial,
  bigint,
  bigserial,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core';

export const profileStatusEnum = pgEnum('company_profile_status', ['not_configured', 'refreshing', 'ready', 'failed']);
export const snapshotStatusEnum = pgEnum('company_profile_snapshot_status', ['running', 'complete', 'failed', 'cancelled']);
export const vectorStoreStatusEnum = pgEnum('company_intel_vector_store_status', ['pending', 'publishing', 'ready', 'failed']);
export const runStageEnum = pgEnum('company_intel_run_stage', ['mapping', 'scraping', 'analysis_structured', 'analysis_overview', 'persisting']);
export const snapshotPageContentTypeEnum = pgEnum('company_snapshot_page_content_type', ['markdown', 'html']);

const emptyJsonArray = sql`'[]'::jsonb`;

export const companyProfiles = pgTable('company_profiles', {
  id: serial('id').primaryKey(),
  domain: text('domain'),
  status: profileStatusEnum('status').notNull().default('not_configured'),
  companyName: text('company_name'),
  tagline: text('tagline'),
  overview: text('overview'),
  valueProps: jsonb('value_props').notNull().default(emptyJsonArray).$type<string[]>(),
  keyOfferings: jsonb('key_offerings').notNull().default(emptyJsonArray).$type<Record<string, unknown>[]>(),
  primaryIndustries: jsonb('primary_industries').notNull().default(emptyJsonArray).$type<string[]>(),
  faviconUrl: text('favicon_url'),
  lastSnapshotId: bigint('last_snapshot_id', { mode: 'number' }),
  activeSnapshotId: bigint('active_snapshot_id', { mode: 'number' }),
  activeSnapshotStartedAt: timestamp('active_snapshot_started_at', { withTimezone: true }),
  lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true }),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  domainIdx: index('company_profiles_domain_idx').on(table.domain),
}));

export const companySnapshots = pgTable('company_snapshots', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  domain: text('domain'),
  status: snapshotStatusEnum('status').notNull().default('running'),
  selectedUrls: jsonb('selected_urls').default(emptyJsonArray).$type<string[]>(),
  mapPayload: jsonb('map_payload'),
  summaries: jsonb('summaries'),
  rawScrapes: jsonb('raw_scrapes'),
  error: text('error'),
  vectorStoreId: text('vector_store_id'),
  vectorStoreStatus: vectorStoreStatusEnum('vector_store_status').notNull().default('pending'),
  vectorStoreError: text('vector_store_error'),
  vectorStoreFileCounts: jsonb('vector_store_file_counts').$type<Record<string, unknown> | null>(),
  progressStage: runStageEnum('progress_stage'),
  progressCompleted: integer('progress_completed'),
  progressTotal: integer('progress_total'),
  progressUpdatedAt: timestamp('progress_updated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, table => ({
  domainIdx: index('company_snapshots_domain_idx').on(table.domain),
  vectorStoreStatusIdx: index('company_snapshots_vector_store_status_idx').on(table.vectorStoreStatus),
}));

export const companySnapshotPages = pgTable('company_snapshot_pages', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  snapshotId: bigint('snapshot_id', { mode: 'number' })
    .notNull()
    .references(() => companySnapshots.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  contentType: snapshotPageContentTypeEnum('content_type').notNull(),
  markdown: text('markdown'),
  html: text('html'),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`).$type<Record<string, unknown>>(),
  wordCount: integer('word_count'),
  scrapedAt: timestamp('scraped_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  snapshotIdx: index('company_snapshot_pages_snapshot_idx').on(table.snapshotId),
}));

export type CompanyProfileRow = typeof companyProfiles.$inferSelect;
export type CompanySnapshotRow = typeof companySnapshots.$inferSelect;
export type CompanySnapshotPageRow = typeof companySnapshotPages.$inferSelect;
