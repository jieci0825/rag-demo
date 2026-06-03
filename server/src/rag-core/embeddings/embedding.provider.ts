export interface EmbeddingProvider {
    /**
     * 为单段文本生成 embedding。
     */
    embedText(text: string): Promise<number[]>

    /**
     * 为多段文本批量生成 embedding。
     */
    embedTexts(texts: string[]): Promise<number[][]>
}
