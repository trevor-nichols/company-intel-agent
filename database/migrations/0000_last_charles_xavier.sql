CREATE TYPE "public"."company_profile_status" AS ENUM('not_configured', 'refreshing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."company_intel_run_stage" AS ENUM('mapping', 'scraping', 'analysis_structured', 'analysis_overview', 'persisting');--> statement-breakpoint
CREATE TYPE "public"."company_snapshot_page_content_type" AS ENUM('markdown', 'html');--> statement-breakpoint
CREATE TYPE "public"."company_profile_snapshot_status" AS ENUM('running', 'complete', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."company_intel_vector_store_status" AS ENUM('pending', 'publishing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "company_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text,
	"status" "company_profile_status" DEFAULT 'not_configured' NOT NULL,
	"company_name" text,
	"tagline" text,
	"overview" text,
	"value_props" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"key_offerings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"primary_industries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"favicon_url" text,
	"last_snapshot_id" bigint,
	"active_snapshot_id" bigint,
	"active_snapshot_started_at" timestamp with time zone,
	"last_refreshed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_snapshot_pages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"snapshot_id" bigint NOT NULL,
	"url" text NOT NULL,
	"content_type" "company_snapshot_page_content_type" NOT NULL,
	"markdown" text,
	"html" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"word_count" integer,
	"scraped_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"domain" text,
	"status" "company_profile_snapshot_status" DEFAULT 'running' NOT NULL,
	"selected_urls" jsonb DEFAULT '[]'::jsonb,
	"map_payload" jsonb,
	"summaries" jsonb,
	"raw_scrapes" jsonb,
	"error" text,
	"vector_store_id" text,
	"vector_store_status" "company_intel_vector_store_status" DEFAULT 'pending' NOT NULL,
	"vector_store_error" text,
	"vector_store_file_counts" jsonb,
	"progress_stage" "company_intel_run_stage",
	"progress_completed" integer,
	"progress_total" integer,
	"progress_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "company_snapshot_pages" ADD CONSTRAINT "company_snapshot_pages_snapshot_id_company_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."company_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_profiles_domain_idx" ON "company_profiles" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "company_snapshot_pages_snapshot_idx" ON "company_snapshot_pages" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "company_snapshots_domain_idx" ON "company_snapshots" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "company_snapshots_vector_store_status_idx" ON "company_snapshots" USING btree ("vector_store_status");