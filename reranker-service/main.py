import os
from contextlib import asynccontextmanager
from math import exp
from typing import Annotated, Any, AsyncIterator, Protocol

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, Field

MODEL_NAME = os.getenv("RERANKER_MODEL", "BAAI/bge-reranker-v2-m3")
MAX_LENGTH = 1024
BATCH_SIZE = int(os.getenv("RERANKER_BATCH_SIZE", "8"))
NonEmptyText = Annotated[str, Field(min_length=1)]


class CrossEncoderModel(Protocol):
    """定义服务运行时所需的最小 CrossEncoder 模型接口。"""

    def predict(
        self,
        sentences: list[list[str]],
        *,
        batch_size: int,
        show_progress_bar: bool,
    ) -> Any:
        """批量预测 query-document 文本对的相关性原始分数。"""


class RerankDocument(BaseModel):
    """表示单个待重排文档。"""

    model_config = ConfigDict(extra="forbid")

    chunk_id: int = Field(alias="chunkId")
    text: str = Field(min_length=1)


class RerankRequest(BaseModel):
    """表示一次批量重排请求。"""

    model_config = ConfigDict(extra="forbid")

    queries: list[NonEmptyText] = Field(min_length=1, max_length=3)
    documents: list[RerankDocument] = Field(min_length=1, max_length=50)


class RerankItem(BaseModel):
    """表示单个 chunk 对全部查询的归一化分数。"""

    model_config = ConfigDict(extra="forbid")

    chunk_id: int = Field(alias="chunkId")
    scores: list[float]


class RerankResponse(BaseModel):
    """表示 Reranker 返回的模型和评分结果。"""

    model_config = ConfigDict(extra="forbid")

    model: str
    results: list[RerankItem]


class HealthResponse(BaseModel):
    """表示 Reranker 服务健康状态。"""

    status: str
    model: str


class RerankerRuntime:
    """管理 CrossEncoder 模型加载和批量推理。"""

    def __init__(
        self,
        model_name: str = MODEL_NAME,
        model: CrossEncoderModel | None = None,
    ) -> None:
        """创建可延迟加载或注入测试模型的运行时。"""
        self.model_name = model_name
        self.model = model

    def load(self) -> None:
        """在服务启动时加载 CrossEncoder 模型。"""
        if self.model is not None:
            return

        from sentence_transformers import CrossEncoder

        self.model = CrossEncoder(
            self.model_name,
            max_length=MAX_LENGTH,
        )

    def rerank(self, request: RerankRequest) -> RerankResponse:
        """批量计算每个文档与全部查询的归一化相关性分数。"""
        if self.model is None:
            raise RuntimeError("Reranker model is not loaded")

        pairs = [
            [query, document.text]
            for document in request.documents
            for query in request.queries
        ]
        raw_scores = self.model.predict(
            pairs,
            batch_size=BATCH_SIZE,
            show_progress_bar=False,
        )
        scores = [sigmoid(float(score)) for score in raw_scores]

        if len(scores) != len(pairs):
            raise RuntimeError(
                "Reranker score count does not match query-document pairs"
            )

        query_count = len(request.queries)
        results = [
            RerankItem(
                chunkId=document.chunk_id,
                scores=scores[index * query_count:(index + 1) * query_count],
            )
            for index, document in enumerate(request.documents)
        ]

        return RerankResponse(
            model=self.model_name,
            results=results,
        )


def sigmoid(value: float) -> float:
    """将 CrossEncoder 原始分数稳定映射到 0 到 1。"""
    if value >= 0:
        return 1 / (1 + exp(-value))

    exponential = exp(value)

    return exponential / (1 + exponential)


def create_app(runtime: RerankerRuntime | None = None) -> FastAPI:
    """创建加载指定 Reranker 运行时的 FastAPI 应用。"""
    app_runtime = runtime or RerankerRuntime()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        """在应用接收请求前加载模型。"""
        app_runtime.load()
        yield

    app = FastAPI(
        title="RAG Cross-Encoder Reranker",
        lifespan=lifespan,
    )

    # 获取 Reranker 服务健康状态
    # GET /health
    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        """返回服务状态和当前模型名称。"""
        return HealthResponse(
            status="ok",
            model=app_runtime.model_name,
        )

    # 对查询和候选文档执行 Cross-Encoder 批量评分
    # POST /rerank
    @app.post("/rerank", response_model=RerankResponse)
    def rerank(request: RerankRequest) -> RerankResponse:
        """返回每个候选文档对全部查询的相关性分数。"""
        return app_runtime.rerank(request)

    return app


app = create_app()
