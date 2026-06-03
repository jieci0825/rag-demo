# Server TODO List

## 推进路径

优先采用端到端 MVP 路径，先跑通：

```txt
新增文本文档 -> 切分 chunks -> 生成 embedding -> 写入数据库 -> 向量检索 -> 生成答案 -> 记录查询日志
```

## P0：服务可运行底座

- [x] 补齐 `server.ts` 和 `app.ts`
- [x] 注册 Koa、body parser、基础路由
- [x] 实现 `GET /health`
- [x] 补齐统一错误处理
- [x] 补齐请求参数校验中间件
- [x] 补齐 request id 中间件
- [x] 确认 `pnpm build` 能通过
- [x] 确认 `pnpm dev` 能启动服务

目标：服务能启动，能返回健康检查，错误响应格式稳定。

## P1：数据库与 schema

- [x] 实现 Drizzle 数据库连接
- [x] 按 `docs/database-schema.md` 创建 `documents` 表
- [x] 按 `docs/database-schema.md` 创建 `document_chunks` 表
- [x] 按 `docs/database-schema.md` 创建 `query_logs` 表
- [x] 接入 `pgvector` 字段
- [x] 生成并验证 migration
- [x] 实现基础时间工具
- [x] 实现内容 hash 工具
- [x] 实现分页工具

目标：数据库表可迁移，服务端能读写文档、chunks、查询日志。

## P2：文本文档索引闭环

- [ ] 实现 `POST /api/documents/text`
- [ ] 保存 document 初始状态为 `pending`
- [ ] 实现文本 loader
- [ ] 实现最小 chunker
- [ ] 接入 embedding provider
- [ ] 写入 document chunks
- [ ] 索引成功后更新 document 为 `indexed`
- [ ] 索引失败后更新 document 为 `failed`
- [ ] 索引失败时记录错误信息

目标：纯文本能导入，并能生成向量写入数据库。

## P3：文档查询能力

- [ ] 实现 `GET /api/documents`
- [ ] 实现 `GET /api/documents/:id`
- [ ] 实现 `GET /api/documents/:id/chunks`
- [ ] 实现 `DELETE /api/documents/:id`
- [ ] 实现基础分页
- [ ] 实现状态筛选

目标：前端可以管理和查看已导入文档。

## P4：检索调试接口

- [ ] 实现 `POST /api/retrieval/search`
- [ ] 将 query 转为 embedding
- [ ] 使用 pgvector cosine 相似度检索 topK chunks
- [ ] 返回 chunk 内容、文档信息、相似度
- [ ] 暂不实现 rerank
- [ ] 暂不实现查询改写
- [ ] 暂不实现查询扩展

目标：可以单独验证召回质量。

## P5：RAG 问答主链路

- [ ] 实现 `POST /api/rag/ask`
- [ ] 复用 retrieval 检索结果
- [ ] 组装 prompt
- [ ] 接入 LLM provider
- [ ] 返回 answer 和引用 chunks
- [ ] 写入 query_logs

目标：完整跑通“问问题 -> 召回上下文 -> 生成答案 -> 记录日志”。

## P6：第二阶段输入来源

- [ ] 实现 URL 文档导入
- [ ] 实现 `.txt` 文件上传
- [ ] 实现 `.md` 文件上传
- [ ] 暂不扩展 PDF
- [ ] 暂不扩展 Word
- [ ] 暂不实现复杂 HTML 正文抽取

目标：支持更多输入来源，但仍保持第一版简单。

## P7：验证与收尾

- [ ] 为核心 service 增加必要测试
- [ ] 为核心 repository 增加必要测试
- [ ] 增加一组最小手动验证数据
- [ ] 验证 build
- [ ] 验证 migration
- [ ] 验证 health
- [ ] 验证文本导入
- [ ] 验证检索
- [ ] 验证问答
- [ ] 清理未使用代码
- [ ] 清理过度抽象

目标：第一版可稳定演示。
