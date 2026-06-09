import { readFile } from 'node:fs/promises'

/**
 * 以 UTF-8 文本读取已保存到磁盘的文档文件。
 */
export async function loadFile(filePath: string): Promise<string> {
    return readFile(filePath, 'utf8')
}
