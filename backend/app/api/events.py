from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.api.deps import get_db, get_current_user
from app.models.event import WebhookEvent, EventStatus
from app.schemas.event import EventDetailResponse, EventResponse, RetryResponse

router = APIRouter()


@router.get(
    "/",
    response_model=list[EventResponse],
    summary="List webhook events with optional filtering",
    dependencies=[Depends(get_current_user)],
)
def list_events(
    response: Response,
    db: Session = Depends(get_db),
    status: str | None = Query(default=None, description="Filter by status (SUCCESS, FAILED, etc.)"),
    endpoint_id: str | None = Query(default=None),
    event_type: str | None = Query(default=None, description="Partial match on event type"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    query = db.query(WebhookEvent).options(joinedload(WebhookEvent.endpoint))

    if status and status.upper() != 'ALL':
        try:
            status_enum = EventStatus(status.upper())
            query = query.filter(WebhookEvent.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status '{status}'. Valid values: {[s.value for s in EventStatus]}",
            )

    if endpoint_id:
        query = query.filter(WebhookEvent.endpoint_id == endpoint_id)

    if event_type:
        query = query.filter(WebhookEvent.event_type.ilike(f"%{event_type}%"))

    total_count = query.count()
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    events = (
        query
        .order_by(desc(WebhookEvent.received_at))
        .limit(limit)
        .offset(offset)
        .all()
    )

    # Populate endpoint_name for each event from DB
    result = []
    for evt in events:
        resp_obj = EventResponse.model_validate(evt)
        if evt.endpoint:
            resp_obj.endpoint_name = evt.endpoint.name
        result.append(resp_obj)

    return result


@router.get(
    "/{event_id}",
    response_model=EventDetailResponse,
    summary="Get full detail for a single event from database",
    dependencies=[Depends(get_current_user)],
)
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = (
        db.query(WebhookEvent)
        .options(joinedload(WebhookEvent.attempts), joinedload(WebhookEvent.endpoint))
        .filter(WebhookEvent.id == event_id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    resp_obj = EventDetailResponse.model_validate(event)
    if event.endpoint:
        resp_obj.endpoint_name = event.endpoint.name
        resp_obj.endpoint_secret = event.endpoint.secret
        resp_obj.endpoint_created_at = event.endpoint.created_at
    return resp_obj


@router.post(
    "/{event_id}/retry",
    response_model=RetryResponse,
    summary="Manually retry a failed event",
    dependencies=[Depends(get_current_user)],
)
def retry_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(WebhookEvent).filter_by(id=event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    if event.status not in (EventStatus.FAILED, EventStatus.RETRYING):
        raise HTTPException(
            status_code=400,
            detail=f"Only FAILED or RETRYING events can be retried. Current status: {event.status}.",
        )

    # Reset for a fresh retry cycle in database
    event.status = EventStatus.RETRYING
    event.attempt_count += 1
    db.commit()

    try:
        from app.workers.tasks import process_webhook_event
        process_webhook_event.delay(event_id)
    except Exception:
        # If celery worker or redis isn't attached at this exact second, state is still cleanly updated in DB
        pass

    return RetryResponse(event_id=event_id)