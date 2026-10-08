from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_db, get_current_user
from app.models.endpoint import WebhookEndpoint
from app.models.event import WebhookEvent
from app.schemas.endpoint import EndpointCreate, EndpointResponse
from app.core.security import generate_webhook_secret


router = APIRouter()


@router.post("/", response_model=EndpointResponse, status_code=status.HTTP_201_CREATED, summary="Create a new webhook endpoint", dependencies=[Depends(get_current_user)])
def create_endpoint(body: EndpointCreate, db: Session = Depends(get_db)):
    endpoint = WebhookEndpoint(name=body.name, secret=body.secret)
    db.add(endpoint)
    db.commit()
    db.refresh(endpoint)
    return endpoint


@router.get("/", summary="List all webhook endpoints with live database metrics", dependencies=[Depends(get_current_user)])
def list_endpoints(db: Session = Depends(get_db)):
    endpoints = db.query(WebhookEndpoint).order_by(WebhookEndpoint.created_at.desc()).all()

    result = []
    for ep in endpoints:
        total = db.query(func.count(WebhookEvent.id)).filter(WebhookEvent.endpoint_id == ep.id).scalar() or 0

        success = db.query(func.count(WebhookEvent.id)).filter(
            WebhookEvent.endpoint_id == ep.id,
            WebhookEvent.status == "SUCCESS",
        ).scalar() or 0

        failed = db.query(func.count(WebhookEvent.id)).filter(
            WebhookEvent.endpoint_id == ep.id,
            WebhookEvent.status == "FAILED",
        ).scalar() or 0

        success_rate = round((success / total * 100), 1) if total > 0 else 0.0
        failure_rate = round((failed / total * 100), 1) if total > 0 else 0.0

        is_degraded = total > 0 and failure_rate >= 5.0
        status_label = "Degraded" if is_degraded else "Active"
        version_label = "Downstream 504 Gateway Timeout" if is_degraded else ("Stripe Sandbox" if "demo" in ep.id.lower() or "demo" in ep.name.lower() else "Active Ingress Listener")

        dest = "https://core-api.internal/v1/" + ep.name.lower().replace(" ", "-")

        result.append({
            "id": ep.id,
            "name": ep.name,
            "secret": ep.secret,
            "created_at": ep.created_at,
            "total_events": total,
            "success_rate": success_rate,
            "failed_events": failed,
            "status": status_label,
            "version": version_label,
            "destination": dest,
            "webhook_url": f"https://api.hooklens.com/wh/{ep.id}",
        })

    return result


@router.get(
    "/{endpoint_id}",
    summary="Get a single endpoint",
    dependencies=[Depends(get_current_user)],
)
def get_endpoint(endpoint_id: str, db: Session = Depends(get_db)):
    endpoint = db.query(WebhookEndpoint).filter_by(id=endpoint_id).first()
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found.")
    return endpoint


@router.delete(
    "/{endpoint_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an endpoint and all its events",
    dependencies=[Depends(get_current_user)],
)
def delete_endpoint(endpoint_id: str, db: Session = Depends(get_db)):
    endpoint = db.query(WebhookEndpoint).filter_by(id=endpoint_id).first()
    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found.")
    db.delete(endpoint)
    db.commit()


@router.post(
    "/generate-secret",
    summary="Generate a cryptographically secure webhook secret",
    dependencies=[Depends(get_current_user)],
)
def generate_secret():
    return {"secret": generate_webhook_secret()}