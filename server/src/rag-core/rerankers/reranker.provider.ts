export interface RerankDocument {
    chunkId: number
    text: string
}

export interface RerankRequest {
    queries: string[]
    documents: RerankDocument[]
}

export interface RerankItem {
    chunkId: number
    scores: number[]
}

export interface RerankResult {
    model: string
    results: RerankItem[]
}

export interface RerankerProvider {
    /**
     * 计算每个候选文档对全部查询的相关性分数。
     */
    rerank(request: RerankRequest): Promise<RerankResult>
}
