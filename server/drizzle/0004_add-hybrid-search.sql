CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN "search_text" text;--> statement-breakpoint
UPDATE "document_chunks"
SET "search_text" = concat_ws(
    E'\n\n',
    NULLIF(
        (
            SELECT string_agg("heading", E'\n' ORDER BY "position")
            FROM jsonb_array_elements_text(
                CASE
                    WHEN jsonb_typeof("metadata"->'headingPath') = 'array'
                        THEN "metadata"->'headingPath'
                    ELSE '[]'::jsonb
                END
            ) WITH ORDINALITY AS "headings"("heading", "position")
        ),
        ''
    ),
    "content"
);--> statement-breakpoint
ALTER TABLE "document_chunks" ALTER COLUMN "search_text" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_document_chunks_search_text_trgm" ON "document_chunks" USING gin ("search_text" gin_trgm_ops);
