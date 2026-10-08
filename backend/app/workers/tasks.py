import json
import random
import logging
from datetime import datetime, timezone

from celery import shared_task
from celery.exceptions import MaxRetriesExceededError

from app.workers.celery_app import celery_app
from app.config import settings

logger = logging.getLogger(__name__)

# Countdown (seconds) for each retry attempt — index = attempt_number - 1
RETRY_COUNTDOWNS = settings.retry_countdowns   # e.g. [5, 15, 30]
MAX_RETRIES = settings.max_retry_attempts       # e.g. 3


@celery_app.task(
    bind=True,
    name="hooklens.process_webhook_event",
    max_retries=MAX_RETRIES,
    acks_late=True,
)
def process_webhook_event(self, event_id: str) -> dict:
    """
    Core processing task for a webhook event.

    bind=True gives access to `self` (the task instance) for:
        self.retry()      — schedule a retry
        self.request.retries — current retry count (0 on first run)

    Flow:
        1. Load event from DB.
        2. Mark as PROCESSING.
        3. Simulate processing logic based on event_type.
        4. Record the attempt.
        5a. If success: mark event SUCCESS.
        5b. If failure + retries left: mark RETRYING, schedule retry.
        5c. If failure + no retries left: mark FAILED.
    """
    # Local import to avoid circular dependency at module load time.
    # The DB session is created per-task (not shared across tasks).
    from app.database import SessionLocal
    from app.models.event import WebhookEvent, EventStatus
    from app.models.attempt import WebhookAttempt

    db = SessionLocal()
    try:
        event = db.query(WebhookEvent).filter_by(id=event_id).first()

        if not event:
            logger.warning(f"[task] Event {event_id} not found — skipping.")
            return {"status": "skipped", "reason": "not found"}

        # ── Increment attempt count and mark as PROCESSING ────────────────────
        attempt_number = event.attempt_count + 1
        event.status = EventStatus.PROCESSING
        event.attempt_count = attempt_number
        db.commit()

        logger.info(f"[task] Processing event {event_id} | type={event.event_type} | attempt={attempt_number}")

        # ── Simulated processing logic ────────────────────────────────────────
        payload = json.loads(event.payload)
        should_fail = _should_fail(event.event_type, payload, attempt_number)

        # ── Record attempt (immutable audit trail) ────────────────────────────
        error_message = (
            f"Downstream service unavailable (attempt {attempt_number})"
            if should_fail else None
        )

        attempt = WebhookAttempt(
            event_id=event_id,
            attempt_number=attempt_number,
            status="FAILED" if should_fail else "SUCCESS",
            error=error_message,
        )
        db.add(attempt)

        # ── Update event state ────────────────────────────────────────────────
        if should_fail:
            event.last_error = error_message

            if attempt_number < MAX_RETRIES:
                countdown = RETRY_COUNTDOWNS[attempt_number - 1]
                event.status = EventStatus.RETRYING
                db.commit()

                logger.info(
                    f"[task] Event {event_id} failed on attempt {attempt_number}. "
                    f"Retrying in {countdown}s."
                )
                raise self.retry(countdown=countdown)

            else:
                # Exhausted all retries
                event.status = EventStatus.FAILED
                db.commit()
                logger.error(
                    f"[task] Event {event_id} permanently failed after {attempt_number} attempts."
                )
                return {"status": "failed", "event_id": event_id}

        else:
            event.status = EventStatus.SUCCESS
            event.processed_at = datetime.now(timezone.utc)
            event.last_error = None
            db.commit()

            logger.info(f"[task] Event {event_id} processed successfully on attempt {attempt_number}.")
            return {"status": "success", "event_id": event_id}

    except Exception as exc:
        # If it's a Celery retry (which raises Retry internally), let it propagate.
        # For any other exception, rollback and re-raise so Celery marks the task as failed.
        db.rollback()
        raise exc
    finally:
        db.close()


def _should_fail(event_type: str, payload: dict, attempt_number: int) -> bool:
    """
    Simulates processing outcomes based on event type.
    In a real system, this would be replaced by actual downstream calls.

    payment.created      → always succeeds
    payment.failed       → always fails (until retries exhausted)
    payment.intermittent → 70% fail chance; simulates flaky downstream service.
                           Succeeds eventually, demonstrating the retry value.
    order.*              → always succeeds
    customer.*           → always succeeds
    <anything else>      → always succeeds
    """
    if event_type == "payment.failed":
        return True

    if event_type == "payment.intermittent":
        # Increase success probability on each retry to simulate transient issues.
        # Attempt 1: 70% fail, Attempt 2: 40% fail, Attempt 3: 10% fail
        fail_probabilities = {1: 0.70, 2: 0.40, 3: 0.10}
        fail_chance = fail_probabilities.get(attempt_number, 0.0)
        return random.random() < fail_chance

    return False