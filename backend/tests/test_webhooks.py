
import json
import pytest
from unittest.mock import patch


def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_webhook_accepted(client, demo_endpoint):
    with patch("app.workers.tasks.process_webhook_event.delay") as mock_delay:
        resp = client.post(
            f"/api/v1/webhooks/{demo_endpoint.id}",
            json={"event": "payment.created", "payment_id": "pay_001", "amount": 2500},
        )
    assert resp.status_code == 202
    body = resp.json()
    assert "event_id" in body
    assert body["status"] == "queued"
    mock_delay.assert_called_once()


def test_webhook_unknown_endpoint(client):
    resp = client.post(
        "/api/v1/webhooks/non-existent-endpoint",
        json={"event": "payment.created"},
    )
    assert resp.status_code == 404


def test_webhook_invalid_json(client, demo_endpoint):
    resp = client.post(
        f"/api/v1/webhooks/{demo_endpoint.id}",
        content=b"not valid json",
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 400


def test_event_persisted_after_webhook(client, db, demo_endpoint):
    from app.models.event import WebhookEvent
    with patch("app.workers.tasks.process_webhook_event.delay"):
        client.post(
            f"/api/v1/webhooks/{demo_endpoint.id}",
            json={"event": "order.created", "order_id": "ord_001"},
        )
    events = db.query(WebhookEvent).all()
    assert len(events) == 1
    assert events[0].event_type == "order.created"
    assert events[0].status.value == "RECEIVED"


def test_event_list_requires_auth(client):
    resp = client.get("/api/v1/events/")
    assert resp.status_code == 403


def test_event_list_with_auth(client, auth_headers, demo_endpoint):
    with patch("app.workers.tasks.process_webhook_event.delay"):
        client.post(
            f"/api/v1/webhooks/{demo_endpoint.id}",
            json={"event": "payment.created"},
        )
    resp = client.get("/api/v1/events/", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) == 1


def test_analytics_summary(client, auth_headers):
    resp = client.get("/api/v1/analytics/summary", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "total" in body
    assert "SUCCESS" in body
    assert "FAILED" in body


def test_retry_non_failed_event_rejected(client, auth_headers, db, demo_endpoint):
    from app.models.event import WebhookEvent, EventStatus
    import json
    event = WebhookEvent(
        endpoint_id=demo_endpoint.id,
        event_type="payment.created",
        payload=json.dumps({"event": "payment.created"}),
        status=EventStatus.SUCCESS,
    )
    db.add(event)
    db.commit()

    resp = client.post(f"/api/v1/events/{event.id}/retry", headers=auth_headers)
    assert resp.status_code == 400