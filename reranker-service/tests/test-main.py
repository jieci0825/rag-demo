from math import isclose

from fastapi.testclient import TestClient

from main import RerankerRuntime, create_app, sigmoid


class FakeCrossEncoder:
    """记录文本对并返回固定原始分数。"""

    def __init__(self, scores: list[float]) -> None:
        """创建返回指定分数的测试模型。"""
        self.scores = scores
        self.calls: list[tuple[list[list[str]], int, bool]] = []

    def predict(
        self,
        sentences: list[list[str]],
        *,
        batch_size: int,
        show_progress_bar: bool,
    ) -> list[float]:
        """记录推理参数并返回固定分数。"""
        self.calls.append((sentences, batch_size, show_progress_bar))

        return self.scores


def create_test_client(
    scores: list[float],
) -> tuple[TestClient, FakeCrossEncoder]:
    """创建注入假模型的测试客户端。"""
    model = FakeCrossEncoder(scores)
    runtime = RerankerRuntime(
        model_name="test-reranker",
        model=model,
    )

    return TestClient(
        create_app(runtime),
        raise_server_exceptions=False,
    ), model


def test_health_returns_model_name() -> None:
    """健康检查返回运行中的模型名称。"""
    client, _ = create_test_client([])

    with client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "model": "test-reranker",
    }


def test_rerank_preserves_document_and_query_order() -> None:
    """批量评分按文档顺序切分每条查询的归一化分数。"""
    client, model = create_test_client([0.0, 1.0, -1.0, 2.0])

    with client:
        response = client.post(
            "/rerank",
            json={
                "queries": ["查询一", "查询二"],
                "documents": [
                    {"chunkId": 10, "text": "文档一"},
                    {"chunkId": 20, "text": "文档二"},
                ],
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "model": "test-reranker",
        "results": [
            {
                "chunkId": 10,
                "scores": [sigmoid(0.0), sigmoid(1.0)],
            },
            {
                "chunkId": 20,
                "scores": [sigmoid(-1.0), sigmoid(2.0)],
            },
        ],
    }
    assert model.calls == [(
        [
            ["查询一", "文档一"],
            ["查询二", "文档一"],
            ["查询一", "文档二"],
            ["查询二", "文档二"],
        ],
        8,
        False,
    )]


def test_rerank_rejects_empty_queries() -> None:
    """请求校验拒绝没有查询的重排请求。"""
    client, _ = create_test_client([])

    with client:
        response = client.post(
            "/rerank",
            json={
                "queries": [],
                "documents": [{"chunkId": 1, "text": "文档"}],
            },
        )

    assert response.status_code == 422


def test_rerank_rejects_empty_query_text() -> None:
    """请求校验拒绝空字符串查询。"""
    client, _ = create_test_client([])

    with client:
        response = client.post(
            "/rerank",
            json={
                "queries": [""],
                "documents": [{"chunkId": 1, "text": "文档"}],
            },
        )

    assert response.status_code == 422


def test_rerank_rejects_incomplete_model_scores() -> None:
    """模型分数没有覆盖全部文本对时终止响应。"""
    client, _ = create_test_client([0.5])

    with client:
        response = client.post(
            "/rerank",
            json={
                "queries": ["查询一", "查询二"],
                "documents": [{"chunkId": 1, "text": "文档"}],
            },
        )

    assert response.status_code == 500


def test_sigmoid_handles_large_values() -> None:
    """Sigmoid 对极端原始分数保持数值稳定。"""
    assert isclose(sigmoid(1000), 1.0)
    assert isclose(sigmoid(-1000), 0.0)
