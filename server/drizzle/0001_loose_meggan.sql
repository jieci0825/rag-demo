DROP INDEX "idx_documents_content_hash";--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_documents_content_hash" ON "documents" USING btree ("content_hash");