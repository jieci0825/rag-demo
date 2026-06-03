# RAG Server API Plan

## 设计原则

第一版 API 只服务一个默认知识库，不暴露知识库、合集、用户、权限相关接口。

API 设计围绕三条主线：

- 文档管理：负责导入、查看、删除和重建索引。
- 检索调试：只返回召回 chunks，不生成答案。
- RAG 问答：返回最终答案和引用来源。

统一前缀：

```txt
/api
```

统一数据格式：

```txt
Content-Type: application/json
```

文件上传接口除外，使用：

```txt
Content-Type: multipart/form-data
```

## 通用响应格式

成功响应直接返回业务数据。

错误响应统一为：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": {}
  }
}
```

## 通用状态码

| 状态码 | 说明 |
|---|---|
| `200` | 请求成功 |
| `201` | 创建成功 |
| `202` | 已接收，异步处理中 |
| `400` | 参数错误 |
| `404` | 资源不存在 |
| `409` | 资源冲突，例如内容重复 |
| `500` | 服务内部错误 |

## Health

### `GET /health`

检查服务状态。

响应：

```json
{
  "status": "ok",
  "database": "ok"
}
```

## Documents

### `POST /api/documents/text`

创建纯文本文档，并触发索引流程。

请求：

```json
{
  "title": "退款政策",
  "content": "审核通过后，退款将在 24 小时内到账。",
  "metadata": {
    "category": "售后"
  }
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | `string` | 是 | 文档标题 |
| `content` | `string` | 是 | 文档原文 |
| `metadata` | `object` | 否 | 文档元数据 |

响应：

```json
{
  "id": "f2c9a767-c2e1-4a31-8f1e-b8126d0b8e1a",
  "title": "退款政策",
  "sourceType": "text",
  "status": "pending",
  "createdAt": "2026-06-03T04:00:00.000Z"
}
```

说明：

- 创建后 `status` 初始为 `pending`。
- 服务端随后执行索引流程。
- 索引成功后状态变为 `indexed`。
- 索引失败后状态变为 `failed`，并记录 `errorMessage`。

### `POST /api/documents/url`

创建 URL 文档，并触发索引流程。

请求：

```json
{
  "title": "产品文档",
  "url": "https://example.com/docs",
  "metadata": {
    "category": "产品"
  }
}
```

响应：

```json
{
  "id": "f2c9a767-c2e1-4a31-8f1e-b8126d0b8e1a",
  "title": "产品文档",
  "sourceType": "url",
  "sourceUri": "https://example.com/docs",
  "status": "pending",
  "createdAt": "2026-06-03T04:00:00.000Z"
}
```

第一版可以作为第二阶段实现。最初可以只支持简单 HTML 正文提取。

### `POST /api/documents/file`

上传文件文档，并触发索引流程。

请求类型：

```txt
multipart/form-data
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `file` | `File` | 是 | 上传文件 |
| `title` | `string` | 否 | 文档标题，不传则使用文件名 |
| `metadata` | `string` | 否 | JSON 字符串 |

响应：

```json
{
  "id": "f2c9a767-c2e1-4a31-8f1e-b8126d0b8e1a",
  "title": "refund-policy.md",
  "sourceType": "file",
  "sourceUri": "/uploads/refund-policy.md",
  "mimeType": "text/markdown",
  "status": "pending",
  "createdAt": "2026-06-03T04:00:00.000Z"
}
```

第一版建议优先支持：

- `.txt`
- `.md`

PDF、Word 后续再扩展。

### `GET /api/documents`

查询文档列表。

查询参数：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `page` | `number` | 否 | `1` | 页码 |
| `pageSize` | `number` | 否 | `20` | 每页数量 |
| `status` | `string` | 否 | 无 | `pending` / `indexed` / `failed` |
| `keyword` | `string` | 否 | 无 | 按标题搜索 |

响应：

```json
{
  "items": [
    {
      "id": "f2c9a767-c2e1-4a31-8f1e-b8126d0b8e1a",
      "title": "退款政策",
      "sourceType": "text",
      "sourceUri": null,
      "mimeType": null,
      "status": "indexed",
      "errorMessage": null,
      "indexedAt": "2026-06-03T04:00:03.000Z",
      "createdAt": "2026-06-03T04:00:00.000Z",
      "updatedAt": "2026-06-03T04:00:03.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

### `GET /api/documents/:id`

查询文档详情。

响应：

```json
{
  "id": "f2c9a767-c2e1-4a31-8f1e-b8126d0b8e1a",
  "title": "退款政策",
  "sourceType": "text",
  "sourceUri": null,
  "mimeType": null,
  "contentHash": "sha256:xxxx",
  "metadata": {
    "category": "售后"
  },
  "status": "indexed",
  "errorMessage": null,
  "indexedAt": "2026-06-03T04:00:03.000Z",
  "createdAt": "2026-06-03T04:00:00.000Z",
  "updatedAt": "2026-06-03T04:00:03.000Z"
}
```

### `GET /api/documents/:id/chunks`

查询某个文档下的 chunks。

查询参数：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `page` | `number` | 否 | `1` | 页码 |
| `pageSize` | `number` | 否 | `50` | 每页数量 |

响应：

```json
{
  "items": [
    {
      "id": "87cf820c-21f0-499a-8bc5-7103f77d5c61",
      "documentId": "f2c9a767-c2e1-4a31-8f1e-b8126d0b8e1a",
      "chunkIndex": 0,
      "content": "审核通过后，退款将在 24 小时内到账。",
      "tokenCount": null,
      "charCount": 20,
      "metadata": {},
      "createdAt": "2026-06-03T04:00:03.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 1
  }
}
```

说明：

- 不返回完整 embedding，避免响应体过大。
- 该接口主要用于调试切片质量。

### `POST /api/documents/:id/reindex`

重新索引文档。

响应：

```json
{
  "id": "f2c9a767-c2e1-4a31-8f1e-b8126d0b8e1a",
  "status": "pending"
}
```

处理逻辑：

```txt
1. 检查文档是否存在。
2. 更新 documents.status = pending。
3. 删除该文档旧 chunks。
4. 重新加载原文。
5. 重新切分、embedding、入库。
6. 成功后更新 status = indexed。
7. 失败后更新 status = failed。
```

第一版可以作为第二阶段实现。

### `DELETE /api/documents/:id`

删除文档及其 chunks。

响应：

```json
{
  "success": true
}
```

说明：

- 数据库层没有外键约束，因此必须由 service 层在事务中删除。
- 删除顺序建议为先删除 `document_chunks`，再删除 `documents`。

## Retrieval

### `POST /api/retrieval/search`

只执行向量召回，不生成最终答案。

请求：

```json
{
  "query": "退款多久能到账？",
  "topK": 5
}
```

字段说明：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `query` | `string` | 是 | 无 | 用户查询 |
| `topK` | `number` | 否 | `5` | 召回数量 |

响应：

```json
{
  "query": "退款多久能到账？",
  "topK": 5,
  "chunks": [
    {
      "chunkId": "87cf820c-21f0-499a-8bc5-7103f77d5c61",
      "documentId": "f2c9a767-c2e1-4a31-8f1e-b8126d0b8e1a",
      "documentTitle": "退款政策",
      "content": "审核通过后，退款将在 24 小时内到账。",
      "score": 0.82,
      "metadata": {}
    }
  ],
  "latencyMs": 36
}
```

说明：

- 只检索 `documents.status = indexed` 的文档。
- 内部会写入 `query_logs`。
- `score` 可以由 `1 - cosine_distance` 得到。

## RAG

### `POST /api/rag/ask`

执行完整 RAG 问答。

请求：

```json
{
  "question": "退款多久能到账？",
  "topK": 5
}
```

字段说明：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `question` | `string` | 是 | 无 | 用户问题 |
| `topK` | `number` | 否 | `5` | 召回 chunks 数量 |

响应：

```json
{
  "answer": "根据知识库内容，退款审核通过后通常会在 24 小时内到账。",
  "sources": [
    {
      "chunkId": "87cf820c-21f0-499a-8bc5-7103f77d5c61",
      "documentId": "f2c9a767-c2e1-4a31-8f1e-b8126d0b8e1a",
      "documentTitle": "退款政策",
      "content": "审核通过后，退款将在 24 小时内到账。",
      "score": 0.82,
      "metadata": {}
    }
  ],
  "latencyMs": 1280
}
```

回答原则：

- 只能基于检索到的上下文回答。
- 如果上下文不足，应回答无法从当前知识库确认。
- 必须返回 sources，方便前端展示引用。

## Query Logs

### `GET /api/query-logs`

查询检索日志。

查询参数：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `page` | `number` | 否 | `1` | 页码 |
| `pageSize` | `number` | 否 | `20` | 每页数量 |

响应：

```json
{
  "items": [
    {
      "id": "8ad23c5f-4277-4dc9-a283-e964f88b51ff",
      "queryText": "退款多久能到账？",
      "topK": 5,
      "retrievedChunks": [
        {
          "chunkId": "87cf820c-21f0-499a-8bc5-7103f77d5c61",
          "documentId": "f2c9a767-c2e1-4a31-8f1e-b8126d0b8e1a",
          "documentTitle": "退款政策",
          "score": 0.82
        }
      ],
      "latencyMs": 36,
      "createdAt": "2026-06-03T04:00:03.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```

### `GET /api/query-logs/:id`

查询单条检索日志详情。

响应：

```json
{
  "id": "8ad23c5f-4277-4dc9-a283-e964f88b51ff",
  "queryText": "退款多久能到账？",
  "topK": 5,
  "retrievedChunks": [
    {
      "chunkId": "87cf820c-21f0-499a-8bc5-7103f77d5c61",
      "documentId": "f2c9a767-c2e1-4a31-8f1e-b8126d0b8e1a",
      "documentTitle": "退款政策",
      "content": "审核通过后，退款将在 24 小时内到账。",
      "score": 0.82
    }
  ],
  "latencyMs": 36,
  "createdAt": "2026-06-03T04:00:03.000Z"
}
```

第一版可以只实现列表接口，详情接口放到第二阶段。

## 第一版接口优先级

### P0：最小闭环

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

### P1：补充文档来源和维护能力

```txt
POST   /api/documents/url
POST   /api/documents/file
POST   /api/documents/:id/reindex
DELETE /api/documents/:id
GET    /api/query-logs/:id
```

### P2：后续增强

```txt
POST /api/retrieval/search-with-rerank
POST /api/rag/stream
```

P2 能力需要等基础链路稳定后再做。

## Zod Schema 建议

### 创建文本文档

```ts
const createTextDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});
```

### 检索

```ts
const retrievalSearchSchema = z.object({
  query: z.string().min(1).max(2000),
  topK: z.number().int().min(1).max(20).default(5),
});
```

### 问答

```ts
const ragAskSchema = z.object({
  question: z.string().min(1).max(2000),
  topK: z.number().int().min(1).max(20).default(5),
});
```

### 分页

```ts
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
```

## 与数据库表的对应关系

| API 模块 | 主要表 | 说明 |
|---|---|---|
| Documents | `documents` | 文档元信息和索引状态 |
| Document Chunks | `document_chunks` | 文档切片和 embedding |
| Retrieval | `document_chunks` / `documents` / `query_logs` | 向量召回和日志记录 |
| RAG | `document_chunks` / `documents` / `query_logs` | 召回、生成答案和返回来源 |
| Query Logs | `query_logs` | 查询历史和召回快照 |

## 不在第一版提供的接口

以下接口第一版不提供：

```txt
/api/knowledge-bases
/api/collections
/api/users
/api/roles
/api/permissions
/api/index-jobs
```

原因：

- 当前只有一个默认知识库，不需要知识库管理接口。
- 当前没有合集概念，不需要 collections。
- 当前不做权限控制，不需要用户和角色。
- 当前不创建 `index_jobs` 表，索引状态记录在 `documents` 表中。
