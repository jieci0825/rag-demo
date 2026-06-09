import type { StructuredChunk } from '../chunkers/index.js'

/**
 * 将标题路径和原始正文组合为生成向量使用的文本。
 */
export function buildEmbeddingText(chunk: StructuredChunk): string {
    const headingText = chunk.metadata.headingPath.join('\n')

    return headingText.length > 0
        ? `${headingText}\n\n${chunk.content}`
        : chunk.content
}
