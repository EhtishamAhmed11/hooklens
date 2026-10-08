
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Enum, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class EventStatus(str,enum.Enum):
    """Lifecycle states of a webhook event."""
    RECEIVED   = "RECEIVED"    # stored, not yet dispatched to worker
    PROCESSING = "PROCESSING"  # worker has picked it up
    SUCCESS    = "SUCCESS"     # processed successfully
    FAILED     = "FAILED"      # exhausted all retry attempts
    RETRYING   = "RETRYING"    # at least one attempt failed; more coming

class WebhookEvent(Base):
    __tablename__="webhook_events"
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    endpoint_id:Mapped[str]=mapped_column(
        ForeignKey("webhook_endpoints.id",ondelete="CASCADE"),
        nullable=False,
    )
    event_type:Mapped[str]=mapped_column(
        String(100),
        nullable=False,
        comment="e.g. payment.created, order.fulfilled",
    )

    payload:Mapped[str]=mapped_column(Text,nullable=False)

    status:Mapped[EventStatus]=mapped_column(
        Enum(EventStatus,name="event_status"),
        nullable=False,
        default=EventStatus.RECEIVED
    )
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    endpoint:Mapped["WebhookEndpoint"]=relationship(
        "WebhookEndpoint",
        back_populates="events",
        lazy="select"
    )
    attempts:Mapped[list["WebhookAttempt"]]=relationship(
        "WebhookAttempt",
        back_populates="event",
        order_by="WebhookAttempt.attempt_number",
        lazy="select",
        cascade="all,delete-orphan"
    )

    __table_args__ = (
        Index("ix_webhook_events_status", "status"),
        Index("ix_webhook_events_endpoint_id", "endpoint_id"),
        Index("ix_webhook_events_received_at", "received_at"),
        # Composite: dashboard "show me all failed events for endpoint X"
        Index("ix_webhook_events_endpoint_status", "endpoint_id", "status"),
    )
    def __repr__(self)->str:
        return f"<WebhookEvent id={self.id} type={self.event_type} status={self.status}>"