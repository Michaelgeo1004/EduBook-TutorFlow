# EduBook — Tutor Booking Platform (Backend)

A production-ready Node.js + Express + TypeScript backend built to mirror Edukko's platform architecture.

## Tech Stack
- **Runtime:** Node.js + Express.js 4 + TypeScript 5
- **Database:** PostgreSQL via Supabase
- **Auth:** JWT (student / tutor / admin roles)
- **Payments:** Stripe Checkout + Webhook verification
- **Real-time:** Socket.io (session-based chat rooms)
- **AI Integration:** Read.ai webhook for session recaps

---

## Project Structure

```
src/
├── index.ts              # App entry — Express + Socket.io server
├── lib/
│   └── supabase.ts       # Supabase client (service role)
├── middleware/
│   └── auth.ts           # JWT authenticate + requireRole guards
├── routes/
│   ├── sessions.ts       # Book, list, reschedule, cancel sessions
│   ├── payments.ts       # Stripe Checkout session creation
│   └── webhooks.ts       # Stripe events + Read.ai recap ingestion
└── socket/
    └── chat.ts           # Socket.io — rooms, messages, typing indicators
```

---

## Architecture Diagram

```mermaid
flowchart TD
  A[Student or Tutor Client] -->|REST + JWT| B[Express API]
  A -->|Socket auth token| C[Socket.io Server]
  B --> D[(Supabase PostgreSQL)]
  C --> D
  B -->|Create checkout session| E[Stripe Checkout]
  E -->|Redirect to success or cancel| A
  E -->|Webhook event| F[/webhooks/stripe]
  F -->|Verify signature + update| D
  G[Read.ai] -->|Webhook payload| H[/webhooks/readai]
  H -->|Store recap + mark session completed| D
```

### Request Flow (Interview-Friendly)
1. Student books a session through `POST /sessions/book` (JWT + role check).
2. API validates tutor availability and writes to Supabase.
3. Student starts payment via `POST /payments/checkout`.
4. Stripe completes checkout and triggers `POST /webhooks/stripe`.
5. Webhook verifies signature and updates `payments` + `sessions`.
6. Student and tutor join `session:{id}` socket room for real-time chat.
7. After meeting, Read.ai calls `POST /webhooks/readai` and recap is saved.

---

## API flow, tokens, and payloads

**Base URL (local):** `http://localhost:4000`

### Tokens

**App users:** sign up / log in via **`POST /auth/signup`** and **`POST /auth/login`** (requires `schema-auth-migration.sql` on `users`).

**Demos / seed users without a password:** mint JWTs with:

```bash
npm run jwt:demo
```

That prints two tokens:

| Token | Role in JWT | Use for |
|--------|-------------|---------|
| First line | `student` | Book, checkout, list *my* sessions as student, payment status |
| Second line | `tutor` | List *my* sessions as tutor, reschedule/cancel if participant, Socket.io as tutor |

**Every authenticated REST call:**

```http
Authorization: Bearer <paste token from jwt:demo>
Content-Type: application/json
```

JWT payload must include: `userId` (UUID), `email`, `role` (`student` | `tutor` | `admin`). The API uses `userId` as the logged-in user id.

**Demo UUIDs (from `demo-data/seed-demo.sql`):**

| | UUID |
|---|------|
| Student `userId` | `11111111-1111-1111-1111-111111111101` |
| Tutor `userId` | `11111111-1111-1111-1111-111111111102` |
| Example session id | `22222222-2222-2222-2222-222222222201` |

---

### End-to-end flow (who does what)

1. **Student** → `POST /sessions/book` (student token) → session `pending`.
2. **Student** → `POST /payments/checkout` (student token) → get `checkout_url`.
3. **Student** → pays in browser (Stripe Checkout). **Stripe** → `POST /webhooks/stripe` (no JWT; `Stripe-Signature` header) → payment `paid`, session `confirmed`.
4. **Student** or **tutor** → Socket.io connect with **their** token → `join_session` → chat.
5. **Read.ai** (or Postman demo) → `POST /webhooks/readai` (optional header `x-readai-secret`) → recap saved, session `completed`.
6. Anyone → `GET /webhooks/recaps/:session_id` (no JWT) → read recap.

---

### REST API reference

#### `GET /health` — health check

| | |
|--|--|
| **Who** | No token |
| **Headers** | none |

**Response:** `{ "status": "ok", "timestamp": "..." }`

---

#### `POST /sessions/book` — create booking

| | |
|--|--|
| **Who** | **Student only** (`role` must be `student`) |
| **Headers** | `Authorization: Bearer <student token>` |

**Body:**

```json
{
  "tutor_id": "11111111-1111-1111-1111-111111111102",
  "subject": "Math",
  "scheduled_at": "2026-04-15T15:00:00.000Z",
  "duration_minutes": 60
}
```

- `tutor_id` — UUID of a user with role tutor (must exist in `users`).
- `scheduled_at` — ISO 8601 datetime.
- `duration_minutes` — optional; defaults to `60`.

`student_id` comes from the JWT `userId`, not the body.

---

#### `GET /sessions/my` — list sessions for logged-in user

| | |
|--|--|
| **Who** | **Student or tutor** (any authenticated role) |
| **Headers** | `Authorization: Bearer <student or tutor token>` |

- **Student token** → rows where `student_id = userId`.
- **Tutor token** → rows where `tutor_id = userId`.

**Body:** none.

---

#### `PATCH /sessions/:id/reschedule`

| | |
|--|--|
| **Who** | **Student or tutor**, only if they are `student_id` or `tutor_id` on that session |
| **Headers** | `Authorization: Bearer <student or tutor token>` |

**Body:**

```json
{
  "scheduled_at": "2026-04-16T16:00:00.000Z"
}
```

---

#### `PATCH /sessions/:id/cancel`

| | |
|--|--|
| **Who** | **Student or tutor**, only if participant on that session |
| **Headers** | `Authorization: Bearer <student or tutor token>` |

**Body:** none (empty JSON is fine).

---

#### `POST /payments/checkout` — Stripe Checkout URL

| | |
|--|--|
| **Who** | **Student only** |
| **Headers** | `Authorization: Bearer <student token>` |

**Body:**

```json
{
  "session_id": "22222222-2222-2222-2222-222222222201"
}
```

- Session must belong to this student (`sessions.student_id = JWT userId`).
- Tutor must have a `tutor_profiles` row for `sessions.tutor_id`, or the API returns 404 with a clear message.

**Response:** `{ "checkout_url": "https://checkout.stripe.com/..." }`

---

#### `GET /payments/session/:session_id` — payment row for one booking

| | |
|--|--|
| **Who** | **Student only** (implementation filters by `student_id = userId`) |
| **Headers** | `Authorization: Bearer <student token>` |

**Body:** none.

Tutor token will not see another user’s payment (404).

---

#### `POST /webhooks/stripe` — Stripe → server

| | |
|--|--|
| **Who** | **Stripe** (not your JWT) |
| **Headers** | `Stripe-Signature: ...` (set by Stripe or `stripe listen`) |
| **Body** | Raw JSON bytes (do not use Postman “pretty” JSON for real signature tests; use Stripe CLI) |

You normally do not call this from Postman; use `stripe listen --forward-to localhost:4000/webhooks/stripe`.

---

#### `POST /webhooks/readai` — Read.ai (or demo) recap

| | |
|--|--|
| **Who** | External service or Postman |
| **Headers** | If `READAI_WEBHOOK_SECRET` is set in `.env`: `x-readai-secret: <same value>` |

**Body (example):**

```json
{
  "meeting_id": "readai_demo_001",
  "external_id": "22222222-2222-2222-2222-222222222201",
  "summary": "Covered derivatives and past paper questions.",
  "key_points": ["Chain rule", "Past paper Q3"],
  "action_items": ["Finish exercises 3-5"],
  "transcript_url": "https://read.ai/demo"
}
```

`external_id` must be the tutoring **session** UUID (`sessions.id`).

---

#### `GET /webhooks/recaps/:session_id` — fetch recap

| | |
|--|--|
| **Who** | No JWT (public in this demo) |

---

### Socket.io (same server as HTTP)

| | |
|--|--|
| **URL** | `http://localhost:4000` (Socket.io client default path `/socket.io`) |
| **Auth** | Pass JWT in handshake: `auth: { token: "<student or tutor JWT>" }` |

**Postman:** **Not suitable for Socket.io.** Postman’s WebSocket mode speaks **plain WebSockets**. Socket.io uses the **Engine.io** wire format (handshake, heartbeats, packet types). Use a **Socket.io client** instead (browser app, or the script below).

**Who:** **Student or tutor** (both work if their `userId` is `student_id` or `tutor_id` on the session).

| Event | Direction | Payload |
|-------|-----------|---------|
| `join_session` | Client → Server | `{ "session_id": "22222222-2222-2222-2222-222222222201" }` |
| `send_message` | Client → Server | `{ "session_id": "...", "content": "Hello" }` |
| `message_history` | Server → Client | `{ messages: [...] }` |
| `new_message` | Server → Client | `{ message: {...} }` |
| `typing` / `stop_typing` | Client → Server | `{ "session_id": "..." }` |
| `user_typing` / `user_stop_typing` | Server → Client | `{ user: "email@..." }` |

**Quick test from terminal (with API running on port 4000):**

```bash
npm run jwt:demo
npm run socket:demo -- "<paste student or tutor JWT>" "<session_id>"
```

You should see `connected`, `joined`, `message_history`, then a `new_message` after the script sends a smoke-test message. Use a `session_id` where that JWT user is the student or tutor.

---

### Quick role cheat sheet

| Action | Student token | Tutor token |
|--------|---------------|-------------|
| Book session | Yes | No |
| My sessions list | Yes (as student) | Yes (as tutor) |
| Reschedule / cancel | Yes if participant | Yes if participant |
| Checkout | Yes | No |
| Payment status GET | Yes (own payments only) | No (404 for others’ payments) |
| Webhooks | N/A (Stripe / Read.ai) | N/A |
| Socket chat | Yes if participant | Yes if participant |

---

## Frontend (Next.js)

App lives in `frontend/` (Next.js 16, React 19, Tailwind 4).

1. Run `schema-auth-migration.sql` in Supabase (adds `password_hash`).
2. Backend `.env`: `FRONTEND_URL=http://localhost:3000`.
3. ```bash
   cd frontend
   cp .env.local.example .env.local
   npm install
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) — sign up as student or tutor, book, pay (Stripe), chat on the session page.

**New API routes used by the UI:** `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`, `GET /tutors`.

Details and page map: `frontend/README.md`.

---

## Run Application (Step by Step)

### 1) Install dependencies
```bash
npm install
```

### 2) Create environment file
```bash
cp .env.example .env
```
Fill `.env` with:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `FRONTEND_URL` (for Stripe redirects + CORS + Socket.io — use `http://localhost:3000` when running the Next app)
- `READAI_WEBHOOK_SECRET` (optional, but recommended)

### 3) Create database schema in Supabase
1. Open Supabase SQL Editor.
2. Copy and run `schema.sql`.
3. Confirm tables are created: `users`, `tutor_profiles`, `sessions`, `payments`, `messages`, `ai_recaps`.
4. For the Next.js app (signup / login), run `schema-auth-migration.sql` once to add `users.password_hash`.

### 4) Start API in dev mode
```bash
npm run dev
```
Health check:
```bash
curl http://localhost:4000/health
```

### 5) Test core endpoints (Postman)
- `POST /sessions/book`
- `GET /sessions/my`
- `POST /payments/checkout`
- `GET /payments/session/:session_id`

### 6) Test Stripe webhook locally
```bash
stripe listen --forward-to localhost:4000/webhooks/stripe
```
Then complete a test checkout and verify DB status updates.

### 7) Test Socket.io chat
1. Open two clients (student and tutor).
2. Connect socket with JWT token.
3. Emit `join_session`.
4. Send `send_message`, `typing`, `stop_typing`.
5. Confirm message persistence in `messages`.

### 8) Test Read.ai webhook
Call `POST /webhooks/readai` with a fake payload containing `external_id` = `session_id`.
Then verify:
- recap is inserted into `ai_recaps`
- session status is updated to `completed`

---

## What We Changed and Current State

### Changes completed
- Migrated from flat root files to proper Express structure under `src/`.
- Added missing `src/lib/supabase.ts`.
- Added `tsconfig.json` aligned with `src/` and `dist/`.
- Added `.env.example` with required keys.
- Removed duplicate unused root files (`auth.ts`, `index.ts`, `sessions.ts`, `payments.ts`, `webhooks.ts`, `chat.ts`).
- Updated documentation and setup commands in this README.

### Current state
- Build passes: `npm run build`.
- Core modules are in place: auth, sessions, payments, webhooks, socket chat.
- Supabase + Stripe + Socket.io + Read.ai integration paths are wired.
- Project is interview-demo ready once `.env` and Supabase schema are configured.

---

## Interview Demo Script (10 Minutes)

### Minute 0-1: Problem and Scope
Say:
> "This backend supports EduTech tutoring workflows end-to-end: booking, payments, real-time messaging, and AI recap ingestion."

Show:
- `src/index.ts` for app bootstrap and route wiring.

### Minute 1-3: Booking + Auth
Say:
> "JWT auth and role guards protect endpoints. Students can book sessions; both participants can reschedule or cancel."

Demo:
1. Call `POST /sessions/book` with student JWT.
2. Call `GET /sessions/my`.
3. Mention conflict detection for tutor schedule overlap.

### Minute 3-5: Payments + Stripe Webhook
Say:
> "Payments are async-safe: checkout is created first, then final status is confirmed through Stripe webhooks."

Demo:
1. Call `POST /payments/checkout`.
2. Show Stripe redirect URL returned.
3. Explain `stripe listen --forward-to localhost:4000/webhooks/stripe`.
4. Mention payment status update flow in `payments` and `sessions`.

### Minute 5-7: Real-Time Chat
Say:
> "Chat is session-scoped with Socket.io rooms, JWT socket auth, and persistent message history."

Demo:
1. Connect two users.
2. Emit `join_session`.
3. Emit `send_message`.
4. Show `new_message` and `message_history` behavior.

### Minute 7-8: AI Recap Webhook
Say:
> "Read.ai pushes post-session recap payloads; we store structured + raw data, then mark the session completed."

Demo:
1. Call `POST /webhooks/readai` with fake payload.
2. Call `GET /webhooks/recaps/:session_id`.

### Minute 8-9: Architecture and Reliability
Say:
> "The architecture separates routes, middleware, socket, and infra client layers. Webhook raw-body handling and role-based access reduce common production issues."

Point to:
- Architecture diagram in this README.

### Minute 9-10: Final Stretch Plan
Say:
> "If I join, first sprint focus would be: request validation, webhook idempotency, integration tests, and observability to harden launch readiness."

---

## Interview Talking Points 🎯

### On the Database Schema (Supabase/PostgreSQL)
> "I designed a normalized schema with 6 tables — users, tutor_profiles, sessions, payments, messages, and ai_recaps. I applied Row Level Security so students can only access their own sessions and payments. I also added indexes on foreign keys and the scheduled_at column to keep booking queries fast."

### On Session Booking
> "The booking flow validates scheduling conflicts before inserting — it checks if the tutor already has a confirmed or pending session overlapping that time window. Status transitions are controlled with a CHECK constraint: pending → confirmed → completed/cancelled/rescheduled."

### On Stripe Integration
> "I used Stripe Checkout in payment_mode — the backend creates the checkout session with metadata containing the session_id, then the webhook confirms payment asynchronously. I made sure the webhook route receives raw Buffer body before express.json() runs, so Stripe's signature verification doesn't break."

### On Socket.io Chat
> "Each tutoring session has its own Socket.io room keyed by session_id. I authenticate the socket connection with the same JWT middleware used by the REST API. On join, the client gets the last 50 messages from Supabase, so chat history is persistent. I also added typing indicators broadcast to the room."

### On the AI Webhook (Read.ai)
> "The webhook receives the AI-generated recap after the meeting ends. Read.ai sends us the summary, key points, and action items. We store the full raw payload as JSONB for debugging, extract the structured fields into dedicated columns, and then mark the session as completed. We also expose a GET endpoint so the frontend can poll for the recap after the session."

### On Auth & RBAC
> "JWT middleware decodes the token and attaches the user's role to req.user. I have a requireRole() guard that's composable — for example, only students can book sessions and create checkout links, while both participants can reschedule or cancel."
