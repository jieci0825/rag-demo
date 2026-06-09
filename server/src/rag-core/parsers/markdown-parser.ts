import { marked } from 'marked'

import { loadText } from '../loaders/text-loader.js'

import type { Token, Tokens } from 'marked'
import type { DocumentBlock, ParsedDocument } from './parsed-document.js'

/**
 * 使用 Marked 的词法结果将 Markdown 转换为统一文档结构。
 */
export function parseMarkdownDocument(source: string): ParsedDocument {
    const content = loadText(source)

    if (content.length === 0) {
        return { blocks: [] }
    }

    const blocks: DocumentBlock[] = []
    appendBlocks(marked.lexer(content), blocks)

    const titleBlock = blocks.find(block => block.type === 'heading' && block.level === 1)

    return {
        title: titleBlock?.content,
        blocks,
    }
}

/**
 * 按 Markdown token 的原始顺序追加支持的文档块。
 */
function appendBlocks(tokens: Token[], blocks: DocumentBlock[]): void {
    for (const token of tokens) {
        if (isHeadingToken(token)) {
            appendContentBlock(blocks, {
                type: 'heading',
                level: token.depth,
                content: inlineTokensToText(token.tokens),
            })
            continue
        }

        if (isParagraphToken(token)) {
            appendContentBlock(blocks, {
                type: 'paragraph',
                content: inlineTokensToText(token.tokens),
            })
            continue
        }

        if (isListToken(token)) {
            appendListItems(token, blocks)
            continue
        }

        if (isCodeToken(token)) {
            appendContentBlock(blocks, {
                type: 'code',
                content: token.text,
            })
            continue
        }

        if (isBlockquoteToken(token)) {
            appendBlocks(token.tokens, blocks)
        }
    }
}

/**
 * 将列表中的每个条目转换为独立文档块，并保持嵌套顺序。
 */
function appendListItems(list: Tokens.List, blocks: DocumentBlock[]): void {
    for (const item of list.items) {
        const content = blockTokensToText(item.tokens.filter(token => token.type !== 'list'))

        appendContentBlock(blocks, {
            type: 'list',
            content,
        })

        for (const token of item.tokens) {
            if (isListToken(token)) {
                appendListItems(token, blocks)
            }
        }
    }
}

/**
 * 将块级 token 中的可见文本合并为列表条目正文。
 */
function blockTokensToText(tokens: Token[]): string {
    return tokens
        .map((token) => {
            if ('tokens' in token && Array.isArray(token.tokens)) {
                return inlineTokensToText(token.tokens)
            }

            return 'text' in token && typeof token.text === 'string'
                ? token.text
                : ''
        })
        .filter(Boolean)
        .join('\n')
}

/**
 * 递归提取行内 token 的可见文本，去除 Markdown 标记。
 */
function inlineTokensToText(tokens: Token[]): string {
    return tokens
        .map((token) => {
            if (token.type === 'br') {
                return '\n'
            }

            if ('tokens' in token && Array.isArray(token.tokens)) {
                return inlineTokensToText(token.tokens)
            }

            return 'text' in token && typeof token.text === 'string'
                ? token.text
                : ''
        })
        .join('')
}

/**
 * 忽略仅包含空白的解析结果。
 */
function appendContentBlock(blocks: DocumentBlock[], block: DocumentBlock): void {
    const content = block.content.trim()

    if (content.length === 0) {
        return
    }

    blocks.push({
        ...block,
        content,
    })
}

/**
 * 判断 token 是否为包含完整标题信息的标准标题 token。
 */
function isHeadingToken(token: Token): token is Tokens.Heading {
    return token.type === 'heading'
        && 'depth' in token
        && Array.isArray(token.tokens)
}

/**
 * 判断 token 是否为包含行内 token 的标准段落 token。
 */
function isParagraphToken(token: Token): token is Tokens.Paragraph {
    return token.type === 'paragraph' && Array.isArray(token.tokens)
}

/**
 * 判断 token 是否为包含条目数组的标准列表 token。
 */
function isListToken(token: Token): token is Tokens.List {
    return token.type === 'list'
        && 'items' in token
        && Array.isArray(token.items)
}

/**
 * 判断 token 是否为标准代码块 token。
 */
function isCodeToken(token: Token): token is Tokens.Code {
    return token.type === 'code'
        && 'text' in token
        && typeof token.text === 'string'
}

/**
 * 判断 token 是否为包含内部块的标准引用 token。
 */
function isBlockquoteToken(token: Token): token is Tokens.Blockquote {
    return token.type === 'blockquote' && Array.isArray(token.tokens)
}
