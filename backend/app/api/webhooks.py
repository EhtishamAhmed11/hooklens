import json
from fastapi import APIRouter,Depends,HTTPException,Request,status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.endpoint import WebhookEndpoint
from app.models.event import WebhookEvent, EventStatus
from app.schemas.event import WebhookIngestResponse
from app.core.security import verify_webhook_signature


router = APIRouter()

@router.post("/{endpoint_id}", response_model=WebhookIngestResponse,status_code=status.HTTP_202_ACCEPTED,summary="Receive a webhook event")
async def received_webhook(endpoint_id:str,request:Request,
db:Session=Depends(get_db))->WebhookIngestResponse:
    """
    Webhook ingestion endpoint — the URL you give to Stripe, GitHub, etc.

    What happens here:
      1. Validate the endpoint exists.
      2. Verify HMAC signature (if header present).
      3. Persist event as RECEIVED.
      4. Dispatch to Celery worker asynchronously.
      5. Return 202 immediately — never blocks the caller.

    The 202 response is intentional: the HTTP contract says
    "I received your request and will process it" — not "I processed it."
    """
    endpoint = db.query(WebhookEndpoint).filter_by(id=endpoint_id).first()
    if not endpoint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail=f"Endpoint '{endpoint_id}' not found" )

    raw_body = await request.body()

    signature = request.headers.get("X-Webhook-Signature")
    if not verify_webhook_signature(raw_body,endpoint.secret,signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Invalid webhook signature")
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Request body must be valid JSON")

    event_type = payload.get("event") or payload.get("type") or "unknown"

    event = WebhookEvent(endpoint_id = endpoint_id, event_type= str(event_type)[:100],payload=json.dumps(payload,ensure_ascii=False),status=EventStatus.RECEIVED)
    db.add(event)
    db.commit()
    db.refresh(event)

    from app.workers.tasks import process_webhook_event
    process_webhook_event.delay(event.id)

    return WebhookIngestResponse(
        event_id=event.id)