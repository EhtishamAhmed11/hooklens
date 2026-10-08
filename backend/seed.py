"""
Seed the database with realistic webhook endpoints, events, and attempt records.
All metrics, totals, rates, and timelines in the application will be calculated directly
from these database rows.

Usage:
    python seed.py
"""
import sys
import os
import json
import uuid
import random
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine
from app.models import Base
from app.models.endpoint import WebhookEndpoint
from app.models.event import WebhookEvent, EventStatus
from app.models.attempt import WebhookAttempt

# Ensure tables exist
Base.metadata.create_all(bind=engine)

db = SessionLocal()

print("Seeding database with live endpoints, events, and retry audit history...")

# 1. Clean existing records for a pristine seed
db.query(WebhookAttempt).delete()
db.query(WebhookEvent).delete()
db.query(WebhookEndpoint).delete()
db.commit()

# 2. Seed Endpoints
now = datetime.now(timezone.utc)
endpoints_data = [
    {
        "id": "ep_prod_87a12",
        "name": "Stripe Production",
        "secret": "whsec_live_99f2430ae18a514d",
        "created_at": now - timedelta(days=48)
    },
    {
        "id": "ep_9823f4",
        "name": "Stripe Demo",
        "secret": "whsec_9b2e401fa88f1c890",
        "created_at": now - timedelta(days=19)
    },
    {
        "id": "ep_shopify_02c",
        "name": "Shopify Fulfillment Webhook",
        "secret": "whsec_shopify_54f9a03b",
        "created_at": now - timedelta(days=5)
    },
    {
        "id": "demo-endpoint",
        "name": "Stripe Demo",
        "secret": "whsec_demo_secret",
        "created_at": now - timedelta(days=30)
    }
]

for ep_info in endpoints_data:
    ep = WebhookEndpoint(**ep_info)
    db.add(ep)
db.commit()
print("[OK] Seeded endpoints: Stripe Production, Stripe Demo, Shopify Fulfillment Webhook")

# 3. Seed Highlighted Events
highlighted_events = [
    {
        "id": "evt_98f420ac8b1e42a9b3d02f",
        "endpoint_id": "ep_9823f4",
        "event_type": "payment.failed",
        "status": EventStatus.FAILED,
        "attempt_count": 3,
        "received_at": now - timedelta(minutes=1, seconds=30),
        "processed_at": now - timedelta(minutes=1),
        "last_error": "Downstream service unavailable: HTTP 503 Service Unavailable (attempt 3 of 3). Host checkout-api.internal timed out after 5000ms.",
        "payload": json.dumps({
            "id": "evt_98f420ac8b1e42a9b3d02f",
            "object": "event",
            "type": "payment.failed",
            "created": int((now - timedelta(minutes=1, seconds=30)).timestamp()),
            "data": {
                "object": {
                    "id": "pi_3MtwBwLkdlwHu7ix28a3tqPa",
                    "amount": 14900,
                    "currency": "usd",
                    "status": "failed",
                    "last_payment_error": {
                        "code": "card_declined",
                        "decline_code": "insufficient_funds",
                        "message": "The customer account has insufficient funds."
                    }
                }
            }
        }, indent=2),
        "attempts": [
            {"attempt_number": 1, "status": "FAILED", "error": "HTTP 500 Internal Error", "created_at": now - timedelta(minutes=1, seconds=29)},
            {"attempt_number": 2, "status": "FAILED", "error": "HTTP 504 Gateway Timeout", "created_at": now - timedelta(minutes=1, seconds=16)},
            {"attempt_number": 3, "status": "FAILED", "error": "HTTP 503 Downstream Service Unavailable", "created_at": now - timedelta(minutes=1)}
        ]
    },
    {
        "id": "evt_b120c841aa99",
        "endpoint_id": "ep_prod_87a12",
        "event_type": "customer.subscription.deleted",
        "status": EventStatus.RETRYING,
        "attempt_count": 2,
        "received_at": now - timedelta(minutes=3),
        "processed_at": now - timedelta(minutes=2, seconds=45),
        "last_error": "HTTP 504 Gateway Timeout (attempt 2 of 5)",
        "payload": json.dumps({"id": "evt_b120c841aa99", "object": "event", "type": "customer.subscription.deleted", "customer": "cus_99318aa"}, indent=2),
        "attempts": [
            {"attempt_number": 1, "status": "FAILED", "error": "HTTP 500 Internal Error", "created_at": now - timedelta(minutes=2, seconds=55)},
            {"attempt_number": 2, "status": "FAILED", "error": "HTTP 504 Gateway Timeout", "created_at": now - timedelta(minutes=2, seconds=45)}
        ]
    },
    {
        "id": "evt_inv_9823f4",
        "endpoint_id": "ep_9823f4",
        "event_type": "invoice.payment_action_required",
        "status": EventStatus.FAILED,
        "attempt_count": 3,
        "received_at": now - timedelta(minutes=5),
        "processed_at": now - timedelta(minutes=4, seconds=30),
        "last_error": "HTTP 500 Internal Error",
        "payload": json.dumps({"id": "evt_inv_9823f4", "type": "invoice.payment_action_required", "amount_due": 8500}, indent=2),
        "attempts": [
            {"attempt_number": 1, "status": "FAILED", "error": "HTTP 500 Internal Error", "created_at": now - timedelta(minutes=4, seconds=50)},
            {"attempt_number": 2, "status": "FAILED", "error": "HTTP 500 Internal Error", "created_at": now - timedelta(minutes=4, seconds=40)},
            {"attempt_number": 3, "status": "FAILED", "error": "HTTP 500 Internal Error", "created_at": now - timedelta(minutes=4, seconds=30)}
        ]
    },
    {
        "id": "evt_ord_c88219",
        "endpoint_id": "ep_shopify_02c",
        "event_type": "order.created",
        "status": EventStatus.SUCCESS,
        "attempt_count": 1,
        "received_at": now - timedelta(minutes=7),
        "processed_at": now - timedelta(minutes=6, seconds=58),
        "last_error": None,
        "payload": json.dumps({"id": "evt_ord_c88219", "type": "order.created", "items_count": 3, "total_price": "128.50"}, indent=2),
        "attempts": [
            {"attempt_number": 1, "status": "SUCCESS", "error": None, "created_at": now - timedelta(minutes=6, seconds=58)}
        ]
    },
    {
        "id": "evt_dsp_09871",
        "endpoint_id": "ep_prod_87a12",
        "event_type": "charge.dispute.created",
        "status": EventStatus.FAILED,
        "attempt_count": 3,
        "received_at": now - timedelta(minutes=10),
        "processed_at": now - timedelta(minutes=9, seconds=30),
        "last_error": "Dispute handler connection pool exhausted.",
        "payload": json.dumps({"id": "evt_dsp_09871", "type": "charge.dispute.created", "dispute_amount": 4500}, indent=2),
        "attempts": [
            {"attempt_number": 1, "status": "FAILED", "error": "HTTP 500 Internal Error", "created_at": now - timedelta(minutes=9, seconds=50)},
            {"attempt_number": 2, "status": "FAILED", "error": "HTTP 500 Internal Error", "created_at": now - timedelta(minutes=9, seconds=40)},
            {"attempt_number": 3, "status": "FAILED", "error": "HTTP 500 Internal Error", "created_at": now - timedelta(minutes=9, seconds=30)}
        ]
    },
    {
        "id": "evt_pi_succ_419",
        "endpoint_id": "ep_9823f4",
        "event_type": "payment_intent.succeeded",
        "status": EventStatus.SUCCESS,
        "attempt_count": 1,
        "received_at": now - timedelta(minutes=15),
        "processed_at": now - timedelta(minutes=14, seconds=58),
        "last_error": None,
        "payload": json.dumps({"id": "evt_pi_succ_419", "type": "payment_intent.succeeded", "amount": 2400}, indent=2),
        "attempts": [
            {"attempt_number": 1, "status": "SUCCESS", "error": None, "created_at": now - timedelta(minutes=14, seconds=58)}
        ]
    },
    {
        "id": "evt_cus_cr_881",
        "endpoint_id": "ep_prod_87a12",
        "event_type": "customer.created",
        "status": EventStatus.SUCCESS,
        "attempt_count": 1,
        "received_at": now - timedelta(minutes=20),
        "processed_at": now - timedelta(minutes=19, seconds=58),
        "last_error": None,
        "payload": json.dumps({"id": "evt_cus_cr_881", "type": "customer.created", "email": "user@example.com"}, indent=2),
        "attempts": [
            {"attempt_number": 1, "status": "SUCCESS", "error": None, "created_at": now - timedelta(minutes=19, seconds=58)}
        ]
    },
    {
        "id": "evt_recent_01",
        "endpoint_id": "ep_9823f4",
        "event_type": "payment.created",
        "status": EventStatus.SUCCESS,
        "attempt_count": 1,
        "received_at": now - timedelta(seconds=2),
        "processed_at": now - timedelta(seconds=1),
        "last_error": None,
        "payload": json.dumps({"id": "evt_recent_01", "type": "payment.created", "amount": 9900}, indent=2),
        "attempts": [
            {"attempt_number": 1, "status": "SUCCESS", "error": None, "created_at": now - timedelta(seconds=1)}
        ]
    },
    {
        "id": "evt_recent_02",
        "endpoint_id": "ep_shopify_02c",
        "event_type": "order.fulfilled",
        "status": EventStatus.PROCESSING,
        "attempt_count": 1,
        "received_at": now - timedelta(minutes=4),
        "processed_at": None,
        "last_error": None,
        "payload": json.dumps({"id": "evt_recent_02", "type": "order.fulfilled", "order_num": "ORD-9901"}, indent=2),
        "attempts": []
    },
    {
        "id": "evt_recent_03",
        "endpoint_id": "ep_9823f4",
        "event_type": "checkout.session.completed",
        "status": EventStatus.RECEIVED,
        "attempt_count": 0,
        "received_at": now - timedelta(minutes=12),
        "processed_at": None,
        "last_error": None,
        "payload": json.dumps({"id": "evt_recent_03", "type": "checkout.session.completed", "session_id": "cs_live_9981"}, indent=2),
        "attempts": []
    }
]

created_events = []
for item in highlighted_events:
    attempts_data = item.pop("attempts")
    evt = WebhookEvent(**item)
    db.add(evt)
    db.flush()
    for att in attempts_data:
        db.add(WebhookAttempt(event_id=evt.id, **att))
    created_events.append(evt)
db.commit()

# 4. Seed the remainder to reach exactly:
# Total: 1,248
# SUCCESS: 1,171
# FAILED: 42
# RETRYING: 35
# PROCESSING: 1
# RECEIVED: 1
# Current counts:
# Highlighted: SUCCESS: 4, FAILED: 3, RETRYING: 1, PROCESSING: 1, RECEIVED: 1 -> Total = 10
# Remaining to generate:
# SUCCESS: 1171 - 4 = 1167
# FAILED: 42 - 3 = 39
# RETRYING: 35 - 1 = 34
# PROCESSING: 0
# RECEIVED: 0

targets = [
    (EventStatus.SUCCESS, 1167, 1),
    (EventStatus.FAILED, 39, 3),
    (EventStatus.RETRYING, 34, 2),
]

event_types = [
    "payment.created", "payment.intent.succeeded", "invoice.paid",
    "customer.created", "charge.succeeded", "order.created",
    "payment.failed", "invoice.payment_failed", "customer.subscription.deleted"
]

all_endpoint_ids = ["ep_prod_87a12", "ep_9823f4", "ep_shopify_02c"]

batch_events = []
batch_attempts = []

for status, count, attempts_count in targets:
    for i in range(count):
        evt_id = "evt_" + uuid.uuid4().hex[:22]
        ep_id = random.choice(all_endpoint_ids)
        ev_type = random.choice(event_types)
        if status == EventStatus.FAILED:
            ev_type = random.choice(["payment.failed", "invoice.payment_failed", "charge.dispute.created"])
        elif status == EventStatus.RETRYING:
            ev_type = random.choice(["customer.subscription.deleted", "payment.intermittent"])

        # Timestamp distributed in past 24 hours
        minutes_ago = random.randint(2, 1440)
        rec_time = now - timedelta(minutes=minutes_ago, seconds=random.randint(0, 59))
        proc_time = rec_time + timedelta(milliseconds=random.randint(45, 180)) if status != EventStatus.RECEIVED else None

        err = f"Downstream service error (attempt {attempts_count})" if status in (EventStatus.FAILED, EventStatus.RETRYING) else None

        batch_events.append(WebhookEvent(
            id=evt_id,
            endpoint_id=ep_id,
            event_type=ev_type,
            payload=json.dumps({"id": evt_id, "type": ev_type, "amount": random.randint(500, 25000)}),
            status=status,
            attempt_count=attempts_count,
            last_error=err,
            received_at=rec_time,
            processed_at=proc_time
        ))

        # Add attempt records
        for att_num in range(1, attempts_count + 1):
            att_status = "SUCCESS" if (status == EventStatus.SUCCESS and att_num == attempts_count) else "FAILED"
            att_err = None if att_status == "SUCCESS" else f"HTTP 50{att_num} Error"
            batch_attempts.append(WebhookAttempt(
                event_id=evt_id,
                attempt_number=att_num,
                status=att_status,
                error=att_err,
                created_at=rec_time + timedelta(seconds=att_num * 10)
            ))

print(f"Inserting {len(batch_events)} events and {len(batch_attempts)} attempt records into PostgreSQL...")
db.bulk_save_objects(batch_events)
db.bulk_save_objects(batch_attempts)
db.commit()

# Print live verified counts directly from database query
total_events = db.query(WebhookEvent).count()
success_events = db.query(WebhookEvent).filter_by(status=EventStatus.SUCCESS).count()
failed_events = db.query(WebhookEvent).filter_by(status=EventStatus.FAILED).count()
retrying_events = db.query(WebhookEvent).filter_by(status=EventStatus.RETRYING).count()
total_attempts = db.query(WebhookAttempt).count()
total_endpoints = db.query(WebhookEndpoint).count()

print("=======================================================")
print(" LIVE DATABASE SEEDING VERIFIED:")
print(f" Endpoints in DB: {total_endpoints}")
print(f" Total Events in DB: {total_events}")
print(f" - SUCCESS: {success_events} ({round(success_events / total_events * 100, 1)}%)")
print(f" - FAILED: {failed_events} ({round(failed_events / total_events * 100, 1)}%)")
print(f" - RETRYING: {retrying_events}")
print(f" Total Attempts in DB: {total_attempts}")
print("=======================================================")

db.close()