import { describe, expect, it } from 'vitest'

import { parseMarkdownDocument } from '../src/rag-core/parsers/index.js'

describe('Markdown 文档解析', () => {
    it('按原始顺序解析标题、段落、列表和代码块', () => {
        const document = parseMarkdownDocument([
            '# 海水缸维护',
            '',
            '检查 **过滤棉**。',
            '',
            '- 检查盐度',
            '- 清理 `藻膜`',
            '',
            '```ts',
            'const salinity = 1.025',
            '```',
        ].join('\n'))

        expect(document).toEqual({
            title: '海水缸维护',
            blocks: [
                { type: 'heading', level: 1, content: '海水缸维护' },
                { type: 'paragraph', content: '检查 过滤棉。' },
                { type: 'list', content: '检查盐度' },
                { type: 'list', content: '清理 藻膜' },
                { type: 'code', content: 'const salinity = 1.025' },
            ],
        })
    })
})
