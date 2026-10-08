from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    total: int
    RECEIVED: int
    PROCESSING: int
    SUCCESS: int
    FAILED: int
    RETRYING: int
    success_rate: float     # percentage, e.g. 93.8
    failure_rate: float     # percentage, e.g. 3.4
    ingress_req_sec: float = 0.0
    avg_latency_ms: int = 0
    p95_latency_ms: int = 0
    mean_backoff_sec: float = 38.4
    dead_letter_endpoint: str | None = None