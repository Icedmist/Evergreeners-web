ALTER TABLE "evergreeners"."users" ADD COLUMN "github_username" text;--> statement-breakpoint
ALTER TABLE "evergreeners"."users" ADD COLUMN "github_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "evergreeners"."users" ADD COLUMN "github_sync_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "evergreeners"."users" ADD COLUMN "last_profile_edit_at" timestamp;--> statement-breakpoint
ALTER TABLE "evergreeners"."users" ADD COLUMN "github_streak" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "evergreeners"."users" ADD COLUMN "github_total_commits" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "evergreeners"."users" ADD COLUMN "github_today_commits" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "evergreeners"."users" ADD COLUMN "github_contribution_data" jsonb;