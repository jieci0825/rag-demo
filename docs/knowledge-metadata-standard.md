# Knowledge Metadata 规范

## 适用范围

本文档用于约束产品、鱼类和珊瑚知识的 metadata 字段。

所有知识 metadata 必须包含公共字段。分类专属字段必须定义在对应的扩展接口中，不得加入公共字段。

## 类型定义

```ts
export interface KnowledgeMetadata extends IndexMetadata {
    category: 'product' | 'fish' | 'coral'
    title: string
    sourceType: 'file' | 'text' | 'url'
    sourceUri: string | null
    status: 'draft' | 'published' | 'deprecated'
    updatedAt: string | null
    tags: string[] | null
}

/**
 * 产品知识分类的 metadata 扩展字段，产品业务字段统一定义在这里。
 */
export interface ProductMetadataExtension {}

/**
 * 鱼类知识分类的 metadata 扩展字段，鱼类业务字段统一定义在这里。
 */
export interface FishMetadataExtension {}

/**
 * 珊瑚知识分类的 metadata 扩展字段，珊瑚业务字段统一定义在这里。
 */
export interface CoralMetadataExtension {}
```

## 公共字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `category` | `'product' \| 'fish' \| 'coral'` | 知识分类 |
| `title` | `string` | 知识标题 |
| `sourceType` | `'file' \| 'text' \| 'url'` | 知识来源类型 |
| `sourceUri` | `string \| null` | 原始来源地址 |
| `status` | `'draft' \| 'published' \| 'deprecated'` | 知识状态 |
| `updatedAt` | `string \| null` | 业务内容最后更新时间 |
| `tags` | `string[] \| null` | 知识标签 |

## 字段规则

### `sourceType`

`sourceType` 只能使用以下值：

| 值 | 说明 |
|---|---|
| `file` | 来源为文件 |
| `text` | 来源为直接录入的文本 |
| `url` | 来源为 URL |

### `sourceUri`

- 有外部来源地址时，记录对应的文件路径或 URL。
- 没有外部来源地址时，使用 `null`。

### `updatedAt`

- 有业务更新时间时，使用 ISO 8601 格式。
- 示例：`2026-06-08T12:00:00.000Z`。
- 尚无业务更新时间时，使用 `null`。

### `tags`

- 未设置标签时，使用 `null`。
- 明确设置为空标签列表时，使用 `[]`。
- 每个标签必须去除首尾空格。
- 标签区分大小写。
- 禁止使用空字符串作为标签。
- 同一标签数组内不得出现重复值。

## 分类扩展规则

| 知识分类 | 扩展接口 |
|---|---|
| `product` | `ProductMetadataExtension` |
| `fish` | `FishMetadataExtension` |
| `coral` | `CoralMetadataExtension` |

- 所有分类共享的字段统一定义在 `KnowledgeMetadata`。
- 分类专属字段只能定义在对应的扩展接口中。
- 不得将某一分类的专属字段加入 `KnowledgeMetadata`。
- 不得在不同分类扩展接口中重复定义同一个公共字段。
- 当前没有已确认的分类专属字段，三个扩展接口保持为空。
