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

/**
 * 约束 LLM 返回的查询转换结构。
 *
 * 三个 oneOf 分支具有相似的对象结构，但分别表达不同策略允许的查询数量：
 * 1. none、rewrite 只产生一条查询，因此 queries 必须恰好包含 1 项。
 * 2. expand 可以补充多个同义词或业务术语，因此允许包含 1 到 3 项。
 * 3. multi_query、decomposition 只有生成多条查询才有意义，因此必须包含 2 到 3 项。
 *
 * 每个分支都重复声明完整对象，是为了让 JSON Schema 在 LLM 生成阶段即可明确区分
 * 各策略的数量规则；服务端仍会通过 queryTransformOutputSchema 进行最终严格校验。
 */
export const QUERY_TRANSFORM_FORMAT = {
    oneOf: [
        // 无需转换或仅改写表达时，只能返回一条最终查询。
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
        // 扩展策略可以返回原查询的一个或多个同义词、业务术语表达。
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
        // 多查询和问题拆解必须生成至少两条独立查询，否则策略没有实际作用。
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
