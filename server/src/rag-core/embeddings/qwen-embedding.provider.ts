import { env } from '../../config/env.js'

import type { EmbeddingProvider } from './embedding.provider.js'

interface OllamaEmbedResponse {
    embeddings?: unknown
}

/**
 * 创建通过本地 Ollama 调用 Qwen embedding 模型的 provider。
 */
export function createQwenEmbeddingProvider(): EmbeddingProvider {
    return {
        embedText: async (text) => {
            const [embedding] = await embedWithOllama([text])

            return embedding
        },
        embedTexts: embedWithOllama,
    }
}

/**
 * 调用 Ollama `/api/embed` 并校验返回向量维度。
 */
async function embedWithOllama(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
        return []
    }

    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/embed`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: env.EMBEDDING_MODEL,
            input: texts,
            dimensions: env.EMBEDDING_DIM,
        }),
    })

    if (!response.ok) {
        throw new Error(`Ollama embedding request failed with status ${response.status}`)
    }

    const data = (await response.json()) as OllamaEmbedResponse
    const embeddings = parseEmbeddings(data.embeddings)

    if (embeddings.length !== texts.length) {
        throw new Error('Ollama embedding response count does not match input count')
    }

    embeddings.forEach(validateEmbedding)

    return embeddings
}

/**
 * 将 Ollama 返回值解析为数值向量列表。
 */
function parseEmbeddings(value: unknown): number[][] {
    if (!Array.isArray(value)) {
        throw new Error('Ollama embedding response missing embeddings')
    }

    return value.map((embedding) => {
        if (!Array.isArray(embedding) || !embedding.every(item => typeof item === 'number')) {
            throw new Error('Ollama embedding response contains invalid embedding')
        }

        return embedding
    })
}

/**
 * 校验单个 embedding 的维度是否符合配置。
 */
function validateEmbedding(embedding: number[]): void {
    if (embedding.length !== env.EMBEDDING_DIM) {
        throw new Error(`Embedding dimension mismatch: expected ${env.EMBEDDING_DIM}, got ${embedding.length}`)
    }
}
