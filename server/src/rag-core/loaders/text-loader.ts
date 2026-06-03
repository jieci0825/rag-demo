/**
 * 读取并标准化纯文本输入。
 */
export function loadText(content: string): string {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
}
