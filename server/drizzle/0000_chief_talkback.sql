CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"token_count" integer,
	"char_count" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_uri" text,
	"mime_type" varchar(100),
	"content_hash" varchar(128),
	"metadata" jsonb,
	"status" varchar(30) NOT NULL,
	"error_message" text,
	"indexed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "query_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query_text" text NOT NULL,
	"query_embedding" vector(1024),
	"top_k" integer NOT NULL,
	"retrieved_chunks" jsonb,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_document_chunks_document_id" ON "document_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_document_chunks_document_id_chunk_index" ON "document_chunks" USING btree ("document_id","chunk_index");--> statement-breakpoint
CREATE INDEX "idx_documents_status" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_documents_content_hash" ON "documents" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "idx_query_logs_created_at" ON "query_logs" USING btree ("created_at");
--> statement-breakpoint
COMMENT ON TABLE "document_chunks" IS '存储文档切片、文本内容和 embedding';
--> statement-breakpoint
COMMENT ON COLUMN "document_chunks"."id" IS 'chunk 唯一标识，作为服务端读写切片的主键';
--> statement-breakpoint
COMMENT ON COLUMN "document_chunks"."document_id" IS '所属文档 ID，逻辑关联 documents.id，不创建数据库外键';
--> statement-breakpoint
COMMENT ON COLUMN "document_chunks"."chunk_index" IS '当前 chunk 在所属文档内的顺序，从 0 开始递增';
--> statement-breakpoint
COMMENT ON COLUMN "document_chunks"."content" IS 'chunk 原始文本内容，用于召回后组装上下文';
--> statement-breakpoint
COMMENT ON COLUMN "document_chunks"."embedding" IS 'chunk 文本对应的 1024 维 embedding 向量，用于 pgvector 相似度检索';
--> statement-breakpoint
COMMENT ON COLUMN "document_chunks"."token_count" IS 'chunk 的 token 数量，无法统计时为空';
--> statement-breakpoint
COMMENT ON COLUMN "document_chunks"."char_count" IS 'chunk 的字符数量，无法统计时为空';
--> statement-breakpoint
COMMENT ON COLUMN "document_chunks"."metadata" IS 'chunk 级扩展元数据，保留切分位置等非固定字段';
--> statement-breakpoint
COMMENT ON COLUMN "document_chunks"."created_at" IS 'chunk 记录创建时间';
--> statement-breakpoint
COMMENT ON TABLE "documents" IS '存储原始文档信息和索引状态';
--> statement-breakpoint
COMMENT ON COLUMN "documents"."id" IS '文档唯一标识，作为服务端读写文档的主键';
--> statement-breakpoint
COMMENT ON COLUMN "documents"."title" IS '文档标题，用于列表展示和检索结果引用';
--> statement-breakpoint
COMMENT ON COLUMN "documents"."source_type" IS '文档来源类型，第一版用于区分 text、file、url 等输入来源';
--> statement-breakpoint
COMMENT ON COLUMN "documents"."source_uri" IS '原始来源地址，可以是本地文件路径、URL，纯文本输入可为空';
--> statement-breakpoint
COMMENT ON COLUMN "documents"."mime_type" IS '文档 MIME 类型，用于记录文件类型或后续 loader 判断';
--> statement-breakpoint
COMMENT ON COLUMN "documents"."content_hash" IS '文档内容 hash，用于同内容文档的去重判断';
--> statement-breakpoint
COMMENT ON COLUMN "documents"."metadata" IS '文档级扩展元数据，保留来源、解析参数等非固定字段';
--> statement-breakpoint
COMMENT ON COLUMN "documents"."status" IS '文档索引状态，当前仅使用 pending、indexed、failed';
--> statement-breakpoint
COMMENT ON COLUMN "documents"."error_message" IS '索引失败时的错误信息，成功或未处理时为空';
--> statement-breakpoint
COMMENT ON COLUMN "documents"."indexed_at" IS '文档完成索引的时间，未完成索引时为空';
--> statement-breakpoint
COMMENT ON COLUMN "documents"."created_at" IS '文档记录创建时间';
--> statement-breakpoint
COMMENT ON COLUMN "documents"."updated_at" IS '文档记录最后更新时间';
--> statement-breakpoint
COMMENT ON TABLE "query_logs" IS '存储查询日志和召回结果';
--> statement-breakpoint
COMMENT ON COLUMN "query_logs"."id" IS '查询日志唯一标识，作为服务端查看历史查询的主键';
--> statement-breakpoint
COMMENT ON COLUMN "query_logs"."query_text" IS '用户提交的原始查询文本';
--> statement-breakpoint
COMMENT ON COLUMN "query_logs"."query_embedding" IS '查询文本对应的 1024 维 embedding 向量，用于排查召回质量';
--> statement-breakpoint
COMMENT ON COLUMN "query_logs"."top_k" IS '本次查询请求的召回数量';
--> statement-breakpoint
COMMENT ON COLUMN "query_logs"."retrieved_chunks" IS '本次查询召回结果快照，记录命中的 chunks 和相关信息';
--> statement-breakpoint
COMMENT ON COLUMN "query_logs"."latency_ms" IS '本次查询链路耗时，单位为毫秒';
--> statement-breakpoint
COMMENT ON COLUMN "query_logs"."created_at" IS '查询日志创建时间';
