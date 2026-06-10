ALTER TABLE "query_logs" ALTER COLUMN "top_k" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "query_logs" ADD COLUMN "query_transforms" jsonb;
