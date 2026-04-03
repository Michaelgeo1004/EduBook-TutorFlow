# Demo seed data (CSV)

Use these UUIDs in JWT `userId` when testing:

| Role    | `userId` (JWT)                         | Email                    |
|---------|----------------------------------------|--------------------------|
| Student | `11111111-1111-1111-1111-111111111101` | student.demo@edubook.test |
| Tutor   | `11111111-1111-1111-1111-111111111102` | tutor.demo@edubook.test   |

Demo session id for checkout / sockets / recap:

- `22222222-2222-2222-2222-222222222201`

## JWT for Postman / Socket.io (no login API)

From project root:

```bash
npm run jwt:demo
```

Uses `JWT_SECRET` from `.env` and prints tokens for the demo student and tutor UUIDs.

## Import order

1. `users.csv`
2. `tutor_profiles.csv`
3. `sessions.csv`
4. `payments.csv` (optional — skip if you only create payments via API)
5. `messages.csv`
6. `ai_recaps.csv` (optional — or test via `POST /webhooks/readai`)

## Supabase Table Editor

**Arrays** (`subjects`, `curriculum`, `key_points`, `action_items`): Supabase CSV import can be picky. If import fails on those columns, use **SQL Editor** with `seed-demo.sql` instead, or paste array literals as in that file.

**JSONB** (`raw_payload`): Left empty in `ai_recaps.csv`; use the webhook to store a real payload, or run `seed-demo.sql`.
