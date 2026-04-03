-- ============================================
-- TUTORFLOW - Supabase PostgreSQL Schema
-- ============================================

-- USERS TABLE (students & tutors)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'tutor', 'admin')),
  password_hash TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TUTOR PROFILES
CREATE TABLE tutor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subjects TEXT[] NOT NULL,           -- e.g. ['Math', 'Physics']
  curriculum TEXT[] NOT NULL,          -- e.g. ['IB', 'GCSE', 'A-Level']
  hourly_rate NUMERIC(10, 2) NOT NULL,
  bio TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  google_refresh_token TEXT,          -- Used for calendar sync
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SESSIONS TABLE (bookings)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tutor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'rescheduled')),
  google_event_id TEXT,               -- Google Calendar event ID
  meeting_url TEXT,                   -- Google Meet / Zoom link
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS TABLE
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_checkout_session_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGES TABLE (real-time chat)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI RECAPS TABLE (Read.ai webhook data)
CREATE TABLE ai_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  meeting_id TEXT,                    -- Read.ai meeting ID
  summary TEXT,
  key_points TEXT[],
  action_items TEXT[],
  transcript_url TEXT,
  raw_payload JSONB,                  -- full webhook payload stored
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recaps ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Students see only their sessions; tutors see only theirs
CREATE POLICY "Session visibility"
  ON sessions FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = tutor_id);

-- Students can book sessions
CREATE POLICY "Students can insert sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Only students can view their own payments
CREATE POLICY "Payment visibility"
  ON payments FOR SELECT
  USING (auth.uid() = student_id);

-- Chat messages visible to session participants only
CREATE POLICY "Message visibility"
  ON messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT student_id FROM sessions WHERE id = session_id
      UNION
      SELECT tutor_id FROM sessions WHERE id = session_id
    )
  );

-- ============================================
-- INDEXES for performance
-- ============================================

CREATE INDEX idx_sessions_student ON sessions(student_id);
CREATE INDEX idx_sessions_tutor ON sessions(tutor_id);
CREATE INDEX idx_sessions_scheduled ON sessions(scheduled_at);
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_payments_session ON payments(session_id);
CREATE INDEX idx_ai_recaps_session ON ai_recaps(session_id);
