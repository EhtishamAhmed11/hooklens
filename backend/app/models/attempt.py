import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class WebhookAttempt(Base):
    """
    Immutable record of a single processing attempt for a WebhookEvent.
    Never updated after creation — append-only audit trail.
    """
    __tablename__ = "webhook_attempts"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    event_id: Mapped[str] = mapped_column(
        ForeignKey("webhook_events.id", ondelete="CASCADE"),
        nullable=False,
    )
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="SUCCESS or FAILED",
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship
    event: Mapped["WebhookEvent"] = relationship(
        "WebhookEvent",
        back_populates="attempts",
    )

    __table_args__ = (
        Index("ix_webhook_attempts_event_id", "event_id"),
    )

    def __repr__(self) -> str:
        return f"<WebhookAttempt event={self.event_id} #{self.attempt_number} {self.status}>"