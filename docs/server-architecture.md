# RAG Server Architecture

## 目标

本文档描述 RAG 服务端第一版的架构设计。

技术栈选择：

- Web 框架：`Koa`
- 开发语言：`TypeScript`
- ORM：`Drizzle`
- 参数校验：`Zod`
- 数据库：`PostgreSQL`
- 向量能力：`pgvector`
- embedding 模型：`qwen3-embedding:8b`
- embedding 维度：`1024`
- 相似度方式：cosine

第一版的核心目标是跑通完整 RAG 主链路：

```txt
导入文档 -> 切分 chunks -> 生成 embedding -> 写入数据库 -> 向量检索 -> 生成答案 -> 记录查询日志
```

## 第一版边界

第一版明确不做以下能力：

- 不做多知识库。
- 不做合集。
- 不做用户、角色、权限控制。
- 不做数据库外键约束。
- 不创建 `index_jobs` 表。
- 不创建向量索引，先使用精确检索跑通流程。
- 不做复杂检索路由。
- 不做 rerank、摘要、查询扩展等高级检索优化。

第一版只有一个默认知识库，因此系统中不需要 `knowledge_bases`、`collections`、`users`、`permissions` 等表和模块。

## 推荐目录结构

```txt
server/
  package.json
  tsconfig.json
  drizzle.config.ts
  .env.example

  src/
    server.ts
    app.ts

    config/
      env.ts

    db/
      index.ts
      schema.ts
      migrate.ts

    middleware/
      error-handler.ts
      validate.ts
      request-id.ts

    lib/
      errors.ts
      logger.ts
      hash.ts
      pagination.ts
      time.ts

    modules/
      documents/
        documents.routes.ts
        documents.controller.ts
        documents.service.ts
        documents.repository.ts
        documents.schema.ts

      chunks/
        chunks.service.ts
        chunks.repository.ts

      retrieval/
        retrieval.routes.ts
        retrieval.controller.ts
        retrieval.service.ts
        retrieval.schema.ts

      rag/
        rag.routes.ts
        rag.controller.ts
        rag.service.ts
        rag.schema.ts
        prompt.ts

      query-logs/
        query-logs.routes.ts
        query-logs.controller.ts
        query-logs.repository.ts
        query-logs.schema.ts

    rag-core/
      loaders/
        text-loader.ts
        file-loader.ts
        url-loader.ts

      chunkers/
        recursive-chunker.ts

      embeddings/
        embedding.provider.ts
        qwen-embedding.provider.ts

      llm/
        llm.provider.ts

      indexer/
        index-document.ts
```

## 分层说明

### `server.ts`

服务启动入口。

职责：

- 读取环境变量。
- 创建 HTTP 服务。
- 监听端口。
- 处理进程级异常。

### `app.ts`

Koa 应用组装层。

职责：

- 注册中间件。
- 注册路由。
- 统一错误处理。
- 注册请求 ID、日志、body parser 等基础能力。

### `config/`

系统配置层。

`env.ts` 使用 `Zod` 校验环境变量，避免服务启动后才发现配置错误。

建议环境变量：

| 变量名 | 说明 |
|---|---|
| `PORT` | 服务端口 |
| `DATABASE_URL` | PostgreSQL 连接地址 |
| `EMBEDDING_MODEL` | embedding 模型名称，默认 `qwen3-embedding:8b` |
| `EMBEDDING_DIM` | embedding 维度，固定为 `1024` |
| `LLM_MODEL` | 生成答案使用的模型 |

### `db/`

数据库访问基础设施。

职责：

- 创建 Drizzle 实例。
- 定义数据库 schema。
- 管理迁移配置。
- 封装 pgvector 字段类型和向量 SQL 表达式。

数据库表设计以 [database-schema.md](./database-schema.md) 为准。

### `middleware/`

Koa 中间件。

建议中间件：

- `error-handler.ts`：统一错误响应。
- `validate.ts`：基于 Zod 的请求参数校验。
- `request-id.ts`：为每次请求生成 request id，方便排查日志。

### `lib/`

通用工具层。

职责：

- 统一错误类型。
- 日志工具。
- 内容 hash。
- 分页参数处理。
- 时间工具。

该目录只放跨模块复用的通用能力，不放业务逻辑。

## 业务模块

### `documents`

文档模块，负责原始文档信息和索引状态。

对应数据库表：

- `documents`
- `document_chunks`

核心职责：

- 新增文本文档。
- 新增 URL 文档。
- 新增文件文档。
- 查询文档列表。
- 查询文档详情。
- 删除文档。
- 重新索引文档。
- 维护文档索引状态：`pending` / `indexed` / `failed`。

### `chunks`

chunk 模块，负责文档切片数据。

对应数据库表：

- `document_chunks`

核心职责：

- 批量写入 chunks。
- 删除某个文档下的 chunks。
- 查询某个文档下的 chunks。

第一版不建议开放独立创建 chunk 的 HTTP 接口，chunk 应该由索引流程生成。

### `retrieval`

检索模块，只负责召回，不负责生成最终答案。

核心职责：

- 将用户 query 转成 embedding。
- 在 `document_chunks` 表中执行向量相似度检索。
- 返回 topK chunks。
- 写入 query log。

该模块适合调试召回质量，是 RAG 系统中非常重要的观察入口。

### `rag`

问答模块，负责完整 RAG 流程。

核心职责：

- 接收用户问题。
- 调用 retrieval 获取相关 chunks。
- 拼接 prompt。
- 调用 LLM 生成答案。
- 返回答案和引用来源。

第一版的 `rag` 模块可以直接复用 `retrieval.service.ts`，不要重复实现检索逻辑。

### `query-logs`

查询日志模块。

对应数据库表：

- `query_logs`

核心职责：

- 记录 query 文本。
- 记录 query embedding。
- 记录 topK。
- 记录召回结果快照。
- 记录检索耗时。
- 查询历史日志。

第一版建议只提供查询接口，不提供修改接口。

## RAG 核心能力

### `loaders`

文档加载器，负责把不同来源转换成纯文本。

第一版建议支持：

- `text-loader.ts`：直接处理纯文本。
- `file-loader.ts`：处理 `.txt` / `.md` 文件。
- `url-loader.ts`：抓取 URL 并提取正文。

PDF、Word、HTML 精准解析可以后续再扩展。

### `chunkers`

文本切分器。

第一版建议实现 `recursive-chunker.ts`。

策略：

1. 优先按标题、段落切分。
2. 段落过长时按句子切分。
3. 句子过长时按标点切分。
4. 仍然过长时按字符长度切分。

推荐默认参数：

| 参数 | 建议值 |
|---|---|
| `chunkSize` | `800` 到 `1200` 字符 |
| `chunkOverlap` | `100` 到 `200` 字符 |

### `embeddings`

embedding 提供者。

建议定义统一接口：

```ts
export interface EmbeddingProvider {
  embedText(text: string): Promise<number[]>;
  embedTexts(texts: string[]): Promise<number[][]>;
}
```

第一版实现 `qwen-embedding.provider.ts`，维度固定校验为 `1024`。

### `llm`

LLM 提供者。

建议定义统一接口：

```ts
export interface LlmProvider {
  generate(input: {
    systemPrompt: string;
    userPrompt: string;
  }): Promise<string>;
}
```

这样后续更换模型供应商时，不影响 `rag.service.ts`。

### `indexer`

索引编排层。

`index-document.ts` 负责把一个 document 转换为可检索的 chunks：

```txt
加载原文 -> 清洗文本 -> 切分 chunks -> 批量 embedding -> 事务写入 chunks -> 更新 documents 状态
```

## 文档索引流程

新增文档后：

```txt
1. 接收 text / file / url 输入。
2. 加载并标准化文本内容。
3. 计算 content_hash。
4. 写入 documents，status = pending。
5. 调用索引器。
6. 删除旧 chunks，如果是重建索引。
7. 切分文本为 chunks。
8. 批量生成 embedding。
9. 批量写入 document_chunks。
10. 更新 documents.status = indexed。
11. 写入 indexed_at。
12. 如果失败，更新 documents.status = failed，并记录 error_message。
```

第一版不创建 `index_jobs` 表，因此可以使用进程内异步任务：

```ts
void indexDocument(documentId);
```

注意：进程内任务在服务重启时可能中断。为降低风险，服务启动时可以扫描 `status = pending` 的文档，并允许用户通过重建索引接口手动恢复。

## 检索流程

```txt
1. 接收 query 和 topK。
2. 将 query 转成 1024 维 embedding。
3. 使用 pgvector cosine distance 检索 document_chunks。
4. 只检索 documents.status = indexed 的文档。
5. 返回 topK chunks。
6. 写入 query_logs。
```

SQL 思路：

```sql
SELECT
  dc.id,
  dc.document_id,
  dc.content,
  dc.metadata,
  d.title,
  dc.embedding <=> $queryEmbedding AS distance
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
WHERE d.status = 'indexed'
ORDER BY dc.embedding <=> $queryEmbedding
LIMIT $topK;
```

接口返回时可以把距离转换为分数：

```ts
score = 1 - distance;
```

## 问答流程

```txt
1. 接收 question 和 topK。
2. 调用 retrieval 获取相关 chunks。
3. 将 chunks 拼接为上下文。
4. 构造 prompt。
5. 调用 LLM 生成答案。
6. 返回 answer 和 sources。
```

第一版 prompt 原则：

- 只允许基于给定上下文回答。
- 如果上下文不足，明确回答不知道。
- sources 返回实际召回的 chunk，便于前端展示引用。

## 错误响应格式

建议统一错误格式：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": {}
  }
}
```

常见错误码：

| 错误码 | 说明 |
|---|---|
| `VALIDATION_ERROR` | 请求参数错误 |
| `NOT_FOUND` | 资源不存在 |
| `CONFLICT` | 内容重复或状态冲突 |
| `INDEX_FAILED` | 文档索引失败 |
| `EMBEDDING_FAILED` | embedding 调用失败 |
| `LLM_FAILED` | LLM 调用失败 |
| `INTERNAL_ERROR` | 未预期服务错误 |

## 实现优先级

第一阶段只实现最小闭环：

```txt
GET  /health
POST /api/documents/text
GET  /api/documents
GET  /api/documents/:id
GET  /api/documents/:id/chunks
POST /api/retrieval/search
POST /api/rag/ask
GET  /api/query-logs
```

第二阶段再补充：

```txt
POST   /api/documents/url
POST   /api/documents/file
POST   /api/documents/:id/reindex
DELETE /api/documents/:id
GET    /api/query-logs/:id
```

第三阶段再考虑：

- PDF / Word 文档解析。
- 向量索引。
- rerank。
- query rewriting。
- query expansion。
- 后台任务表。
- 多知识库。
