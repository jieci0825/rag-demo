import { asc, desc, sql } from 'drizzle-orm'
import { cosineDistance } from 'drizzle-orm/sql/functions/vector'

import { db } from '../../db/index.js'
import { documentChunks } from '../../db/schema.js'

export interface RetrievalCandidate {
    chunkId: number
    documentId: number
    chunkIndex: number
    content: string
    metadata: Record<string, unknown> | null
    score: number
}

const candidateFields = {
    chunkId: documentChunks.id,
    documentId: documentChunks.documentId,
    chunkIndex: documentChunks.chunkIndex,
    content: documentChunks.content,
    metadata: documentChunks.metadata,
}

/**
 * 使用 pgvector 余弦距离召回语义最相近的 chunks。
 */
export async function searchChunksByVector(
    embedding: number[],
    limit: number,
): Promise<RetrievalCandidate[]> {
    const distance = cosineDistance(documentChunks.embedding, embedding)
    const score = sql<number>`1 - (${distance})`.mapWith(Number)

    return db
        .select({
            ...candidateFields,
            score,
        })
        .from(documentChunks)
        .orderBy(distance, asc(documentChunks.id))
        .limit(limit)
}

/**
 * 使用 pg_trgm 的连续片段相似度召回包含相关词面的 chunks。
 */
export async function searchChunksByKeyword(
    query: string,
    limit: number,
): Promise<RetrievalCandidate[]> {
    const score = sql<number>`
        word_similarity(${query}, ${documentChunks.searchText})
    `.mapWith(Number)

    return db
        .select({
            ...candidateFields,
            score,
        })
        .from(documentChunks)
        .where(sql`${score} > 0`)
        .orderBy(desc(score), asc(documentChunks.id))
        .limit(limit)
}
