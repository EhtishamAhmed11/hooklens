from celery import Celery
from app.config import settings

celery_app = Celery(
    "hooklens",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],

    # Timezone
    timezone="UTC",
    enable_utc=True,

    # Task behavior
    task_acks_late=True,          # only ack after task completes (safer for retries)
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1, # fairness: each worker takes 1 task at a time
    task_always_eager=settings.celery_task_always_eager,

    # Result expiry (keep results for 1 hour — enough for debugging)
    result_expires=3600,

    # Beat schedule (optional future extension)
    beat_schedule={},
)