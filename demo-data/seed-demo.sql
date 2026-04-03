-- Run after schema.sql. Same UUIDs as demo-data/*.csv (use this if CSV array/JSON import fails).

INSERT INTO users (id, email, full_name, role, created_at) VALUES
  ('11111111-1111-1111-1111-111111111101', 'student.demo@edubook.test', 'Alex Student', 'student', '2026-04-02T10:00:00Z'),
  ('11111111-1111-1111-1111-111111111102', 'tutor.demo@edubook.test', 'Jordan Tutor', 'tutor', '2026-04-02T10:00:00Z')
ON CONFLICT (email) DO NOTHING;

INSERT INTO tutor_profiles (id, user_id, subjects, curriculum, hourly_rate, bio, is_verified, created_at) VALUES
  (
    '33333333-3333-3333-3333-333333333301',
    '11111111-1111-1111-1111-111111111102',
    ARRAY['Math', 'Physics'],
    ARRAY['IB', 'GCSE'],
    45.00,
    'IB Maths and Physics specialist',
    true,
    '2026-04-02T10:00:00Z'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO sessions (id, student_id, tutor_id, subject, scheduled_at, duration_minutes, status, meeting_url, created_at) VALUES
  (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    '11111111-1111-1111-1111-111111111102',
    'Math',
    '2026-04-10T14:00:00Z',
    60,
    'pending',
    'https://meet.google.com/lookup/demo-session',
    '2026-04-02T10:00:00Z'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, session_id, student_id, stripe_payment_intent_id, stripe_checkout_session_id, amount, currency, status, created_at) VALUES
  (
    '44444444-4444-4444-4444-444444444401',
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    'pending_demo_pi_001',
    'cs_test_demo_001',
    45.00,
    'usd',
    'pending',
    '2026-04-02T10:00:00Z'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, session_id, sender_id, content, created_at) VALUES
  ('55555555-5555-5555-5555-555555555501', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'Hi — can we focus on calculus derivatives this week?', '2026-04-02T11:00:00Z'),
  ('55555555-5555-5555-5555-555555555502', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111102', 'Yes. I will share practice problems before the session.', '2026-04-02T11:01:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ai_recaps (id, session_id, meeting_id, summary, key_points, action_items, transcript_url, raw_payload, received_at) VALUES
  (
    '66666666-6666-6666-6666-666666666601',
    '22222222-2222-2222-2222-222222222201',
    'readai_demo_meeting_001',
    'Covered chain rule and product rule with IB-style questions.',
    ARRAY['Chain rule', 'Product rule', 'Past paper Q3'],
    ARRAY['Complete exercises 3-5', 'Review formula sheet'],
    'https://read.ai/demo/recap',
    '{"source":"demo_seed"}'::jsonb,
    '2026-04-02T12:00:00Z'
  )
ON CONFLICT (id) DO NOTHING;
