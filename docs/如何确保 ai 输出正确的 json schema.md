# 如何确保 ai 输出正确的 json schema

简单来说，分为下面几步骤：
- 提示词控制，在 prompt 中提供 json schema 样例
- api 原生约束，现在的大模型基本都支持提供类似的配置，保证输出的 json 格式合法
- 工程校验，比如利用 zod 校验