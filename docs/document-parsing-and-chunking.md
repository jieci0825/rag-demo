# 文档解析与 Chunk 切分方案

## 目标

本文档描述不同格式的文档如何经过格式解析、统一结构转换、Chunk 切分和向量化处理。

该方案需要满足以下要求：

- 不为每一份具体文档编写单独的切分策略。
- 每种受支持的文档格式只实现一次解析器。
- 能够识别 Markdown 等结构化格式中的标题层级。
- 无法可靠识别结构的纯文本继续使用递归文本切分。
- 标题路径参与向量生成，提升 Chunk 的检索语义。
- 原始正文和用于生成向量的文本保持可区分。

本文档描述的是后续设计方案，不表示当前服务端已经实现这些能力。

## 整体流程

```txt
原始文档
  -> 格式解析器
  -> 统一文档结构
  -> 通用 Chunker
  -> 构建向量输入文本
  -> 生成 Embedding
  -> 存储 Chunk、Metadata 和 Embedding
```

不同格式使用各自的解析器，但解析后都转换为同一种文档结构：

```txt
Markdown --\
HTML -------+-> 统一文档结构 -> 通用 Chunker
DOCX -------+
纯文本 -----/
```

## 格式解析层

格式解析层只负责读取原始格式中明确存在的结构，不负责生成 Embedding。

不同格式的处理方式：

| 格式 | 可使用的结构信息 |
|---|---|
| Markdown | `#`、`##` 等标题标记，段落、列表和代码块 |
| HTML | `h1` 至 `h6`、`p`、`li`、`pre` 等元素 |
| DOCX | 标题样式、段落、列表和表格等结构 |
| 纯文本 | 普通段落和换行，不推断不确定的标题 |

纯文本没有稳定的标题标记。系统不根据编号、行长或文字内容猜测标题，避免把普通内容误判为章节边界。

## 统一文档结构

所有格式解析器输出统一的 `ParsedDocument`：

```typescript
interface ParsedDocument {
    title?: string
    blocks: DocumentBlock[]
}

interface DocumentBlock {
    type: 'heading' | 'paragraph' | 'list' | 'code'
    content: string
    level?: number
    metadata?: Record<string, unknown>
}
```

字段说明：

| 字段 | 说明 |
|---|---|
| `title` | 文档明确提供的标题，没有时不设置 |
| `blocks` | 按原始顺序排列的文档内容块 |
| `type` | 内容块类型 |
| `content` | 内容块原始文本 |
| `level` | 标题层级，仅标题块使用 |
| `metadata` | 格式解析时需要保留的其他结构信息 |

## Markdown 解析示例

### 处理前

```markdown
# 海水缸维护

## 每周维护

检查过滤棉和蛋白质分离器。

- 检查盐度
- 清理藻膜

## 水质检测

定期检测氨和硝酸盐。
```

### 处理后

```json
{
  "title": "海水缸维护",
  "blocks": [
    {
      "type": "heading",
      "level": 1,
      "content": "海水缸维护"
    },
    {
      "type": "heading",
      "level": 2,
      "content": "每周维护"
    },
    {
      "type": "paragraph",
      "content": "检查过滤棉和蛋白质分离器。"
    },
    {
      "type": "list",
      "content": "检查盐度"
    },
    {
      "type": "list",
      "content": "清理藻膜"
    },
    {
      "type": "heading",
      "level": 2,
      "content": "水质检测"
    },
    {
      "type": "paragraph",
      "content": "定期检测氨和硝酸盐。"
    }
  ]
}
```

### 解析伪代码

```txt
function parseMarkdown(source):
    syntaxTree = markdownParser.parse(source)
    blocks = []

    for node in syntaxTree:
        if node is heading:
            blocks.push({
                type: "heading",
                level: node.level,
                content: node.text
            })

        else if node is paragraph:
            blocks.push({
                type: "paragraph",
                content: node.text
            })

        else if node is listItem:
            blocks.push({
                type: "list",
                content: node.text
            })

        else if node is codeBlock:
            blocks.push({
                type: "code",
                content: node.code
            })

    return {
        title: first level-one heading if present,
        blocks
    }
```

## 通用 Chunker

通用 Chunker 接收统一文档结构，不直接处理 Markdown、HTML 或 DOCX 的原始语法。

主要规则：

1. 按顺序读取 `blocks`。
2. 遇到标题时更新当前标题路径。
3. 明确的标题边界不与上一章节正文混合。
4. 同一章节内容未超过长度限制时可以合并。
5. 一个章节超过长度限制时，在章节内部继续按段落、句子和字符递归切分。
6. 每个 Chunk 保存生成时对应的完整标题路径。

### 标题路径示例

输入：

```markdown
# 海水缸维护

## 水质检测

### 基础指标

定期检测氨和硝酸盐。
```

对应标题路径：

```json
["海水缸维护", "水质检测", "基础指标"]
```

当出现同级或更高级标题时，移除已经结束的下级标题：

```txt
# 海水缸维护
## 水质检测
### 基础指标
## 换水
```

处理到“换水”后，标题路径变为：

```json
["海水缸维护", "换水"]
```

### 切分伪代码

```txt
function chunkDocument(document, maxLength):
    chunks = []
    headingPath = []
    currentBlocks = []

    for block in document.blocks:
        if block.type == "heading":
            flush currentBlocks as chunks
            remove headings whose level is greater than or equal to block.level
            append block to headingPath
            continue

        if adding block exceeds maxLength:
            flush currentBlocks as chunks

        if block itself exceeds maxLength:
            recursively split block inside current headingPath
            continue

        append block to currentBlocks

    flush currentBlocks as chunks
    return chunks
```

## Chunk 数据

结构化文档生成的 Chunk 至少包含正文和标题路径：

```typescript
interface StructuredChunk {
    content: string
    metadata: {
        headingPath: string[]
        startOffset?: number
        endOffset?: number
    }
}
```

示例：

```json
{
  "content": "定期检测氨和硝酸盐。",
  "metadata": {
    "headingPath": ["海水缸维护", "水质检测"]
  }
}
```

`content` 保存 Chunk 的原始正文。标题路径不直接混入该字段，以便展示、引用和后续处理时能够区分标题与正文。

## Embedding 输入

标题路径只存入 Metadata 并不能提升向量召回。生成 Embedding 时，需要把标题路径和正文组合成用于索引的文本。

```typescript
function buildEmbeddingText(chunk: StructuredChunk): string {
    const headingText = chunk.metadata.headingPath.join('\n')

    return headingText
        ? `${headingText}\n\n${chunk.content}`
        : chunk.content
}
```

数据库中的 Chunk：

```json
{
  "content": "定期检测氨和硝酸盐。",
  "metadata": {
    "headingPath": ["海水缸维护", "水质检测"]
  }
}
```

实际发送给 Embedding 模型的文本：

```txt
海水缸维护
水质检测

定期检测氨和硝酸盐。
```

这样可以同时保留：

- 标题提供的主题和层级语义。
- 正文提供的具体事实和描述。
- 原始正文与检索上下文之间的明确边界。

如果后续增加 BM25 等关键词检索，也应使用同一份“标题路径 + 正文”文本建立关键词索引，而不是只索引正文。

## 纯文本处理

纯文本无法可靠确定标题，因此不使用标题推断规则。

纯文本解析器可以把原始内容转换为普通段落：

```json
{
  "blocks": [
    {
      "type": "paragraph",
      "content": "无法可靠判断结构的纯文本内容。"
    }
  ]
}
```

后续继续使用当前递归切分策略：

1. 优先按段落切分。
2. 过长段落按换行和句子标点切分。
3. 仍然过长时按更细标点切分。
4. 最后按字符切分。
5. 根据配置保留相邻 Chunk 的重叠内容。

纯文本 Chunk 没有明确标题路径时，Embedding 输入直接使用 `content`。

## 长度规则

Chunk 长度不存在适用于所有文档和问题的固定最优值。

第一阶段继续沿用当前长度配置，不因为增加结构解析而同时调整 Chunk 大小。结构化切分首先解决标题边界和上下文丢失问题，长度参数需要通过实际检索问题集单独评估。

结构化文档的处理顺序为：

1. 优先保持明确章节边界。
2. 章节内部再按照长度限制切分。
3. 生成向量时加入标题路径。

长度限制不能替代结构边界。即使一个 Chunk 没有超过长度上限，也不应把两个明确章节合并为同一个 Chunk。

## 存储原则

每个 Chunk 分别保存以下信息：

| 数据 | 用途 |
|---|---|
| `content` | 展示、引用和提供给生成模型的原始正文 |
| `metadata.headingPath` | 保存文档结构和章节上下文 |
| `embedding` | 使用标题路径和正文共同生成的向量 |
| `charCount` | 记录原始正文字符数 |
| `tokenCount` | 记录 Embedding 输入的 Token 数量，能够统计时保存 |

Embedding 输入文本可以在索引时临时构建，不要求重复保存到 `content`。

## 当前范围

当前已经实现纯文本递归切分和正文 Embedding。

本方案后续需要实现的能力包括：

- 统一文档结构类型。
- Markdown 格式解析器。
- 面向统一文档结构的 Chunker。
- Chunk 标题路径 Metadata。
- 使用标题路径和正文共同生成 Embedding。

以下能力不属于本方案当前确认范围：

- 使用模型推断纯文本标题。
- 为每份具体文档配置标题识别规则。
- 自动调整不同文档的最佳 Chunk 长度。
- Late Chunking。
- 自动生成 Chunk 摘要或上下文说明。
- BM25、混合检索和 Reranking。

## 参考资料

- Anthropic, [Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)
- Karpukhin et al., [Dense Passage Retrieval for Open-Domain Question Answering](https://aclanthology.org/2020.emnlp-main.550/)
- Liu et al., [Dense Hierarchical Retrieval for Open-domain Question Answering](https://aclanthology.org/2021.findings-emnlp.19/)
- Günther et al., [Late Chunking: Contextual Chunk Embeddings Using Long-Context Embedding Models](https://arxiv.org/abs/2409.04701)
