import { createHash } from 'node:crypto'

/**
 * 生成内容去重使用的 SHA-256 hash。
 */
export function createContentHash(content: string | Buffer): string {
    return createHash('sha256').update(content).digest('hex')
}
