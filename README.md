# HookLens

**Webhook reliability and failure-triage platform for engineering teams.**

HookLens receives webhooks, stores them durably, processes them asynchronously, retries failures automatically, and gives developers an API (and dashboard) to investigate exactly what went wrong.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-5.4-37814A?logo=celery&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

---

## The Problem

Modern applications depend on webhooks from payment providers, SaaS platforms, and internal services. When processing fails, developers end up digging through logs and third-party dashboards to answer simple questions:

- What event failed?
- Why did it fail?
- How many times was it retried?
- Can I safely replay it?

HookLens puts the answers in one place.

---

## How It Works

```text
External Service
       │  POST /api/v1/webhooks/{endpoint_id}
       ▼
┌──────────────────────┐
│       FastAPI        │  1. Validate endpoint + HMAC signature
│                      │  2. Persist event (status: RECEIVED)
│                      │  3. Enqueue task, return 202 Accepted
└───────┬──────────────┘
        │
   ┌────┴─────┐
   ▼          ▼
PostgreSQL   Redis ──► Celery Worker
(events,      (queue)   • marks PROCESSING
 attempts)              • records an attempt
                        • SUCCESS, or RETRYING → FAILED
```

The API never does the slow work itself. It acknowledges the event after saving it and hands processing to a background worker, so a failing downstream service can't block or time out the webhook sender.

### Event lifecycle

```text
RECEIVED → PROCESSING → SUCCESS
                ↓
            RETRYING → PROCESSING → ... → FAILED (after max attempts)
```

---

## Features

- **Webhook ingestion** — `202 Accepted` response after durable storage; processing happens off the request path
- **Signature verification** — constant-time HMAC-SHA256 check via the `X-Webhook-Signature` header
- **Async processing** — Redis-backed Celery workers with late acknowledgement and one-task-at-a-time prefetch for fairness
- **Automatic retries** — configurable attempt limit and delay schedule
- **Immutable attempt history** — every attempt is stored as an append-only audit record
- **Manual replay** — retry any `FAILED` or `RETRYING` event via the API
- **Filtering and pagination** — filter events by status, endpoint, and event type
- **Analytics** — single aggregated query for totals, success rate, and failure rate
- **JWT authentication** on all management endpoints
- **Endpoint management** — create endpoints, generate secure signing secrets, view per-endpoint success rates
- **Migrations** with Alembic, indexed queries for dashboard workloads
- **Interactive API docs** at `/docs` (Swagger) and `/redoc`

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | Python 3.12, FastAPI, Pydantic v2 |
| Database | PostgreSQL 16, SQLAlchemy 2.0, Alembic |
| Queue / broker | Redis 7, Celery 5 |
| Auth | JWT (python-jose) |
| Monitoring | Flower (Celery task dashboard) |
| Testing | Pytest, httpx |
| Infra | Docker, Docker Compose, GitHub Actions |

---

## Project Structure

```text
hooklens/
├── backend/
│   ├── app/
│   │   ├── main.py            # App entry, middleware, router registration
│   │   ├── config.py          # Typed settings from environment variables
│   │   ├── database.py        # Engine, connection pool, session dependency
│   │   ├── models/            # SQLAlchemy tables (endpoint, event, attempt)
│   │   ├── schemas/           # Pydantic request/response models
│   │   ├── api/               # Route handlers (auth, webhooks, events, ...)
│   │   ├── core/              # Security helpers, exception handlers
│   │   └── workers/           # Celery app and processing tasks
│   ├── alembic/               # Database migrations
│   ├── tests/                 # Pytest suite
│   ├── seed.py                # Creates the demo endpoint
│   └── Dockerfile
├── docker-compose.yml
└── .github/workflows/test.yml
```

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git

### 1. Clone and configure

```bash
git clone <your-repo-url>
cd hooklens
cp .env.example .env
```

Edit `.env` and set a strong `SECRET_KEY` and your own admin credentials.

### 2. Start the stack

```bash
docker compose up --build -d
```

### 3. Run migrations and seed the demo endpoint

```bash
docker compose run --rm backend alembic upgrade head
docker compose run --rm backend python seed.py
```

### 4. Open it

| Service | URL |
|---|---|
| API | http://localhost:8000 |
| Swagger docs | http://localhost:8000/docs |
| Flower (task monitor) | http://localhost:5555 |

---

## Try It Out

**1. Log in and get a token**

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

```bash
TOKEN="<paste access_token here>"
```

**2. Send a webhook** (this is the URL you'd give to Stripe, GitHub, etc.)

```bash
curl -X POST http://localhost:8000/api/v1/webhooks/demo-endpoint \
  -H "Content-Type: application/json" \
  -d '{"event":"payment.created","payment_id":"pay_001","amount":2500}'
```

```json
{ "event_id": "…", "status": "queued" }
```

**3. Simulate failure scenarios**

| `event` value | Behaviour |
|---|---|
| `payment.created` | Succeeds on the first attempt |
| `payment.failed` | Fails every attempt, ends as `FAILED` |
| `payment.intermittent` | Fails randomly with decreasing probability, usually recovers on retry |

**4. Inspect and replay**

```bash
# Summary stats
curl http://localhost:8000/api/v1/analytics/summary -H "Authorization: Bearer $TOKEN"

# Failed events only
curl "http://localhost:8000/api/v1/events/?status=FAILED" -H "Authorization: Bearer $TOKEN"

# Full detail with attempt history
curl http://localhost:8000/api/v1/events/<event_id> -H "Authorization: Bearer $TOKEN"

# Replay a failed event
curl -X POST http://localhost:8000/api/v1/events/<event_id>/retry -H "Authorization: Bearer $TOKEN"
```

---

## API Overview

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | No | Obtain a JWT |
| `POST` | `/api/v1/webhooks/{endpoint_id}` | Signature | Ingest a webhook (returns `202`) |
| `GET` | `/api/v1/events/` | JWT | List events (filter by `status`, `endpoint_id`, `event_type`; `limit`/`offset`) |
| `GET` | `/api/v1/events/{id}` | JWT | Event detail with payload and attempts |
| `POST` | `/api/v1/events/{id}/retry` | JWT | Manually retry a failed event |
| `GET` | `/api/v1/endpoints/` | JWT | List endpoints with event counts and success rate |
| `POST` | `/api/v1/endpoints/` | JWT | Create an endpoint |
| `DELETE` | `/api/v1/endpoints/{id}` | JWT | Delete an endpoint and its events |
| `POST` | `/api/v1/endpoints/generate-secret` | JWT | Generate a signing secret |
| `GET` | `/api/v1/analytics/summary` | JWT | Totals, success rate, failure rate |
| `GET` | `/api/v1/analytics/recent` | JWT | Most recent events |
| `GET` | `/health` | No | Liveness check |

### Signing webhooks

If a request includes `X-Webhook-Signature: sha256=<hex>`, HookLens verifies it against the endpoint's secret using HMAC-SHA256 over the raw request body.

```bash
BODY='{"event":"payment.created","amount":2500}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "whsec_demo_secret" | awk '{print $2}')

curl -X POST http://localhost:8000/api/v1/webhooks/demo-endpoint \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$SIG" \
  -d "$BODY"
```

> In demo mode, requests with no signature header are accepted so the API is easy to try. Enforcing signatures in production is a one-line change in `core/security.py`.

---

## Configuration

All settings come from environment variables (see `.env.example`).

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `REDIS_URL` | Redis connection string | — |
| `SECRET_KEY` | JWT signing key | — |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime | `480` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Demo admin credentials | `admin` / `admin123` |
| `MAX_RETRY_ATTEMPTS` | Total processing attempts per event | `3` |
| `RETRY_COUNTDOWN_SECONDS` | Comma-separated delay before each retry | `5,15,30` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:5173` |

---

## Running Tests

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest tests/ -v
```

Tests use SQLite and mock the Celery dispatch, so no Docker services are needed. CI runs the same suite plus `ruff` on every push and pull request.

---

## Design Decisions

**Return 202, process later.** Webhook providers time out and retry aggressively. Persisting first and acknowledging immediately means a slow or broken downstream never causes duplicate deliveries from the sender.

**Persist before enqueueing.** The event exists in PostgreSQL before the task is queued, so a lost queue message can't lose the event, and failed events are always inspectable.

**Append-only attempts.** Each attempt is its own row rather than an overwritten counter, which preserves the full failure history for debugging.

**Separate models and schemas.** Database tables and API contracts are defined independently, so internal columns never leak through a response.

**`acks_late` and single-task prefetch.** A task is only acknowledged after it finishes, and workers take one task at a time, so a crashed worker's task is redelivered and long tasks don't starve others.

**Indexed for the dashboard.** Indexes on `status`, `endpoint_id`, `received_at`, and `(endpoint_id, status)` match the filters the dashboard actually uses.

---

## Known Limitations and Next Steps

This is an MVP focused on the core reliability workflow. For production I would add:

- A real user table with hashed passwords and role-based access control
- Enforced signature verification and hashed/encrypted stored secrets
- Idempotency keys to deduplicate repeated deliveries
- Rate limiting on the ingestion endpoint
- Dead-letter queue and configurable per-endpoint retry policies
- Cursor-based pagination and a JSONB payload column for queryable payloads
- Structured logging, Prometheus metrics, and OpenTelemetry tracing
- Cloud deployment with infrastructure as code

---

## License

MIT
