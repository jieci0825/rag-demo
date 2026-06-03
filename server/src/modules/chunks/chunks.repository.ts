import { db } from '../../db/index.js'
import { documentChunks } from '../../db/schema.js'

import type { NewDocumentChunk } from '../../db/schema.js'

/**
 * 批量写入文档 chunks。
 */
export async function createDocumentChunks(chunks: NewDocumentChunk[]): Promise<void> {
    if (chunks.length === 0) {
        return
    }

    await db.insert(documentChunks).values(chunks)
}
