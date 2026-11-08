# CarePortal: Healthcare Patient Portal

A lightweight, full-stack healthcare portal with three role-based workspaces (patient, doctor, administrator).

> Uses **synthetic data only**. It is not a clinically validated system, gives no diagnoses or treatment advice, and has **not** been assessed for compliance with DPDP Act 2023, ABDM or any other regulation.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js 14 (App Router, Server Components), TypeScript, Tailwind CSS, shadcn/ui-style primitives, Lucide |
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic |
| Database | PostgreSQL 16 (SQLite only as a zero-setup fallback for local dev and tests) |
| Auth | Argon2id hashes, JWT in an HttpOnly + SameSite=Lax cookie, RBAC enforced in the API |
| Tooling | Docker Compose, Pytest, Playwright |

## Architecture

It is a modular monolith. The browser only talks to the Next.js origin. Next proxies `/api/*` to FastAPI, so the session cookie stays first-party and no CORS is needed.

```
Browser ──► Next.js (SSR pages + small client islands) ──/api/*──► FastAPI ──► PostgreSQL
                                                                     └──► uploads volume (lab files)
```

```
backend/app/
  core/        config, password hashing, JWT
  models.py    13 tables (users, patients, doctors, departments, availability, appointments,
               medical_records, prescriptions, prescription_items, lab_reports, invoices,
               notifications, audit_logs)
  schemas.py   Pydantic request/response models
  deps.py      auth + role dependencies
  services/    business logic: scheduling, clinical, files, notifications, audit
  routers/     thin HTTP layer: auth, catalog, patients, appointments, doctor, notifications, admin
  seed.py      synthetic demo data
alembic/       migrations
tests/         pytest: auth, RBAC, workflows

frontend/src/
  app/(auth)   sign-in and registration
  app/patient  overview, find doctor, booking, appointments, records, billing, profile
  app/doctor   today, schedule, consultation (+prescription, lab requests), labs, availability
  app/admin    stats, doctors (approve, fees, schedules), users, departments, appointments, billing, audit
  components/  ui primitives, app shell, shared clinical views
  lib/         API clients (browser + server), formatting helpers
  hooks/       useAction (mutation + server refresh)
```

### Key design decisions
- **Server-first rendering.** Pages fetch on the server with the user's cookie. Client JS is used only for forms and buttons, so first-load JS is about 87 kB shared plus 0–5 kB per route. There is no global state library: after a mutation, `router.refresh()` re-renders the page from the server.
- **Double-booking protection in the database.** A partial unique index on `(doctor_id, start_at) WHERE status <> 'cancelled'` stops double bookings. If two requests race for one slot, one gets HTTP 409. Slots are also checked against the doctor's weekly availability.
- **Treatment relationship.** A doctor can see a patient's history only if they have a non-cancelled appointment with that patient. Each such view is written to the audit log.
- **Hospital wall-clock time.** Appointment times are stored as naive datetimes in `HCPP_TIMEZONE` (default Asia/Kolkata). This is simple for a single-site hospital. A multi-timezone deployment would need tz-aware columns.

## Running locally

### Option A: Docker (PostgreSQL)
```bash
cp .env.example .env
```
Edit `.env` and set real secrets, then:
```bash
docker compose up --build
```
```bash
docker compose exec api python -m app.seed
```
Open http://localhost:3000.

### Option B: without Docker (SQLite fallback)
```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
```
```bash
cd backend && .venv/bin/alembic upgrade head && .venv/bin/python -m app.seed
```
```bash
cd backend && .venv/bin/uvicorn app.main:app --port 8000
```
```bash
cd frontend && npm install && npm run dev
```

The demo accounts and their shared password are documented at the top of `backend/app/seed.py`. These include an admin, five doctors, one doctor pending approval, and three patients.

### Tests
```bash
cd backend && .venv/bin/python -m pytest -q
```
For E2E tests, start both servers on a freshly seeded DB first:
```bash
cd frontend && npx playwright install chromium && npm run test:e2e
```

## Security measures
- Argon2id password hashing. Login gives the same response for unknown and wrong-password accounts, and is rate-limited per IP+email.
- HttpOnly, SameSite=Lax session cookie, set `Secure` in production. A custom `X-Requested-With` header is required on every state-changing request as an extra CSRF defence.
- RBAC on every endpoint. Requests for other people's records return 404, not 403, so the response does not confirm that a record exists.
- Uploads are limited to 5 MB, and the type is checked from the file's magic bytes (PDF/PNG/JPEG). Files get random names, are stored outside any web root, and are served only through an authorised endpoint with `no-store`.
- API responses use `Cache-Control: no-store` and are sent with nosniff, frame-deny and referrer headers. Stack traces are never returned to clients.
- The audit log covers logins, bookings, status changes, record views and creation, lab downloads and admin actions. Clinical text is never logged.
- Production mode will not start with the default JWT secret or with insecure cookies.

## Known limitations / next steps
- The login rate limiter keeps its state in process memory. With multiple API replicas it should move to a shared store such as Redis or PostgreSQL. Behind the Next.js proxy, the API sees the client IP via `X-Forwarded-For`.
- There is no online payment. Admins record payments that were taken at the desk.
- Notifications are in-app only. Email and SMS can be added in `services/notifications.py`.
- "Manage user permissions" is currently limited to enabling and disabling accounts and approving doctors. There is no fine-grained permission editor yet.
- HTTPS termination (for example Caddy or Nginx in front of `web`) is not included in the compose file.
- There is no password reset or MFA yet.
