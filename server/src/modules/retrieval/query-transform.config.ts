export const QUERY_TRANSFORM_SYSTEM_PROMPT = [
    '你需要为知识库检索选择且只选择一种查询转换策略，并直接生成转换结果。',
    '不要回答用户问题。',
    '可选策略:',
    '- none: 查询已经清晰、独立且适合检索，原样返回。',
    '- rewrite: 查询只有一个意图，但存在口语、指代或表达不清，将其改写为清晰、独立的查询。',
    '- expand: 查询缺少常见同义词或业务术语，生成 1 到 3 条包含相关检索词的查询。',
    '- multi_query: 同一意图适合从不同表达或检索角度查找，生成 2 到 3 条完整查询。',
    '- decomposition: 查询包含多个独立意图，拆分为 2 到 3 条可独立检索的子查询。',
    '保留原始意图、实体、数字、时间、否定和约束条件。',
    '不得添加原始查询中不存在的业务条件或事实。',
    '使用与原始查询相同的语言，并保留必要的技术术语。',
    '每条 queries 内容必须非空且可以独立用于检索，最多返回 3 条。',
].join('\n')

export const QUERY_TRANSFORM_FORMAT = {
    oneOf: [
        {
            type: 'object',
            properties: {
                strategy: {
                    enum: ['none', 'rewrite'],
                },
                queries: {
                    type: 'array',
                    items: {
                        type: 'string',
                        minLength: 1,
                    },
                    minItems: 1,
                    maxItems: 1,
                },
            },
            required: ['strategy', 'queries'],
            additionalProperties: false,
        },
        {
            type: 'object',
            properties: {
                strategy: {
                    enum: ['expand'],
                },
                queries: {
                    type: 'array',
                    items: {
                        type: 'string',
                        minLength: 1,
                    },
                    minItems: 1,
                    maxItems: 3,
                },
            },
            required: ['strategy', 'queries'],
            additionalProperties: false,
        },
        {
            type: 'object',
            properties: {
                strategy: {
                    enum: ['multi_query', 'decomposition'],
                },
                queries: {
                    type: 'array',
                    items: {
                        type: 'string',
                        minLength: 1,
                    },
                    minItems: 2,
                    maxItems: 3,
                },
            },
            required: ['strategy', 'queries'],
            additionalProperties: false,
        },
    ],
}
