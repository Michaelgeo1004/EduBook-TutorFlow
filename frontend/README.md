# EduBook frontend (Next.js)

## Plan (what this app does)

1. **Auth** — `POST /auth/signup` and `POST /auth/login` (requires `password_hash` migration on `users`).
2. **Tutors** — `GET /tutors` for the booking dropdown.
3. **Sessions** — `GET /sessions/my`, `POST /sessions/book` (students).
4. **Payments** — `POST /payments/checkout` → redirect to Stripe; return URLs under `/payment/*`.
5. **Chat** — Socket.io on the same origin as `NEXT_PUBLIC_API_URL`, JWT in `auth.token`.
6. **Read.ai recaps** — After `POST /webhooks/readai`, the session page sidebar shows summary, key points, and action items (`GET /webhooks/recaps/:sessionId`). Empty state explains how to test with Postman + `x-readai-secret`.

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing |
| `/login` | Log in |
| `/signup` | Sign up (student or tutor) |
| `/dashboard` | Home tiles |
| `/dashboard/sessions` | Session list |
| `/dashboard/sessions/[id]` | Detail, pay (student), chat, recap |
| `/dashboard/book` | Book session (student) |
| `/payment/success` | After Stripe (query `session_id`) |
| `/payment/cancelled` | Cancelled checkout |

## Run

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Backend must run on port **4000** with `FRONTEND_URL=http://localhost:3000` and DB migration `schema-auth-migration.sql` applied for email/password users.
