from datetime import datetime
from typing import Any
from pydantic import BaseModel
from app.models.event import EventStatus


class AttemptResponse(BaseModel):
    id: str
    attempt_number: int
    status: str
    error: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class EventResponse(BaseModel):
    """Compact representation — used in list views."""
    id: str
    endpoint_id: str
    event_type: str
    status: EventStatus
    attempt_count: int
    received_at: datetime
    processed_at: datetime | None
    last_error: str | None
    endpoint_name: str | None = None
    model_config = {"from_attributes": True}


class EventDetailResponse(EventResponse):
    """Full detail — used on the single-event page."""
    payload: str                    # raw JSON string; frontend parses it
    attempts: list[AttemptResponse]
    endpoint_secret: str | None = None
    endpoint_created_at: datetime | None = None


class WebhookIngestResponse(BaseModel):
    event_id: str
    status: str = "queued"


class RetryResponse(BaseModel):
    event_id: str
    status: str = "requeued"