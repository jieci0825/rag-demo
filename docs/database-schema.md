# Database Schema

## 前置约束

- 第一版只考虑一个默认知识库。
- 第一版不做用户权限控制。
- 数据库层严格禁止外键约束，所有关联字段均采用逻辑外键。
- 第一版不创建 `index_jobs` 表，索引状态先记录在 `documents` 表中。
- embedding 模型使用 `qwen3-embedding:8b`。
- embedding 维度固定为 `1024`。
- embedding 字段类型使用 `vector(1024)`。
- 相似度方式使用 cosine。
- 第一版暂不创建向量索引，先用精确检索跑通流程。

## 总体表

| 表名 | 作用 |
|---|---|
| `documents` | 存储原始文档信息和索引状态 |
| `document_chunks` | 存储文档切片、文本内容和 embedding |
| `query_logs` | 存储查询日志和召回结果 |

## documents

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `uuid` | 是 | 文档 ID，主键 |
| `title` | `text` | 是 | 文档标题 |
| `source_type` | `varchar(50)` | 是 | 来源类型，如 `file` / `text` / `url` |
| `source_uri` | `text` | 否 | 原始来源地址，本地文件路径或 URL |
| `mime_type` | `varchar(100)` | 否 | 文件类型，如 `application/pdf` |
| `content_hash` | `varchar(128)` | 否 | 内容 hash，用于去重 |
| `metadata` | `jsonb` | 否 | 额外元数据 |
| `status` | `varchar(30)` | 是 | `pending` / `indexed` / `failed` |
| `error_message` | `text` | 否 | 索引失败原因 |
| `indexed_at` | `timestamptz` | 否 | 完成索引时间 |
| `created_at` | `timestamptz` | 是 | 创建时间 |
| `updated_at` | `timestamptz` | 是 | 更新时间 |

## document_chunks

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `uuid` | 是 | chunk ID，主键 |
| `document_id` | `uuid` | 是 | 逻辑关联 `documents.id`，不建外键 |
| `chunk_index` | `integer` | 是 | 当前文档内的 chunk 顺序 |
| `content` | `text` | 是 | chunk 文本内容 |
| `embedding` | `vector(1024)` | 是 | 1024 维向量 |
| `token_count` | `integer` | 否 | token 数量 |
| `char_count` | `integer` | 否 | 字符数量 |
| `metadata` | `jsonb` | 否 | chunk 级元数据 |
| `created_at` | `timestamptz` | 是 | 创建时间 |

## query_logs

| 字段名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `uuid` | 是 | 查询日志 ID，主键 |
| `query_text` | `text` | 是 | 用户查询内容 |
| `query_embedding` | `vector(1024)` | 否 | 查询向量，便于后续排查召回质量 |
| `top_k` | `integer` | 是 | 本次召回数量 |
| `retrieved_chunks` | `jsonb` | 否 | 召回结果快照 |
| `latency_ms` | `integer` | 否 | 检索耗时 |
| `created_at` | `timestamptz` | 是 | 查询时间 |

## 建议索引

| 表名 | 索引 | 说明 |
|---|---|---|
| `documents` | `idx_documents_status` | 按索引状态查询文档 |
| `documents` | `idx_documents_content_hash` | 用于文档去重 |
| `document_chunks` | `idx_document_chunks_document_id` | 根据文档查 chunks |
| `document_chunks` | `uniq_document_chunks_document_id_chunk_index` | 防止同一文档 chunk 顺序重复 |
| `query_logs` | `idx_query_logs_created_at` | 按时间查看查询日志 |
