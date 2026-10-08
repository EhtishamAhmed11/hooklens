
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class WebhookEndpoint(Base):
    __tablename__="webhook_endpoints"

    id:Mapped[str]=mapped_column(String(36),primary_key=True,default=lambda:str(uuid.uuid4())
    )
    name:Mapped[str]=mapped_column(String(100),nullable=False)

    # HMAC secret used to verify incoming webhook signatures.
    # Stored as-is here for demo — in production,we hash it.

    secret:Mapped[str]=mapped_column(String(225),nullable=False)
    created_at:Mapped[datetime]=mapped_column(
        DateTime(timezone=True),
        default=lambda:datetime.now(timezone.utc),
        nullable=False
    )
    events:Mapped[list["WebhookEvent"]]=relationship(
        "WebhookEvent",
        back_populates="endpoint",
        lazy="select"
    )
    __table_args__=(
        Index("ix_webhook_endpoints_name","name"),
    )

    def __repr__(self)->str:
        return f"<WebhookEndpoint id={self.id} name={self.name}>"