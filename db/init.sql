-- =============================================================================
-- CreatorEDU — Local PostgreSQL Schema
-- Run this once in pgAdmin to create all tables in your local database.
--
-- This is the authoritative schema for the new self-hosted backend.
-- It replaces all Supabase migrations.
--   • auth.users         → public.users (managed by NextAuth)
--   • RLS policies       → removed (enforced in API routes)
--   • TABLESPACE clauses → removed (not needed locally)
--   • Supabase functions → removed or replaced with Drizzle transactions
-- =============================================================================

-- Enable pgcrypto for gen_random_uuid() on older Postgres versions
-- (Postgres 13+ has it built-in, but this is harmless)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- Trigger helper function (used by updated_at triggers)
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- NextAuth tables (required by @auth/drizzle-adapter)
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT,
  email           TEXT UNIQUE,
  email_verified  TIMESTAMP,
  image           TEXT,
  -- Custom columns
  phone           TEXT UNIQUE,
  password_hash   TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL,
  provider            TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          INTEGER,
  token_type          TEXT,
  scope               TEXT,
  id_token            TEXT,
  session_state       TEXT,
  PRIMARY KEY (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_token TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires       TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token      TEXT NOT NULL,
  expires    TIMESTAMP NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- =============================================================================
-- profiles
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  role        TEXT DEFAULT 'lawyer',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- site_settings (singleton row)
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_settings (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  hero_title      TEXT,
  hero_subtitle   TEXT,
  hero_cta_text   TEXT,
  hero_cta_link   TEXT,
  hero_video_id   TEXT,
  default_theme   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);

CREATE OR REPLACE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- courses
-- =============================================================================

CREATE TABLE IF NOT EXISTS courses (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) NOT NULL UNIQUE,
  description     TEXT,
  hero_image      TEXT,
  category        VARCHAR(50),
  level           VARCHAR(50),
  estimated_hours INTEGER,
  requirements    TEXT,
  skills          TEXT,
  students        INTEGER DEFAULT 0,
  rating          NUMERIC(2,1) DEFAULT 0,
  featured        BOOLEAN DEFAULT false,
  created_at      TIMESTAMP DEFAULT now(),
  status          TEXT DEFAULT 'published',
  published       BOOLEAN DEFAULT false,
  is_paid         BOOLEAN NOT NULL DEFAULT false,
  price           NUMERIC(10,2)
);

CREATE INDEX IF NOT EXISTS courses_status_idx    ON courses (status);
CREATE INDEX IF NOT EXISTS courses_published_idx ON courses (published);

-- =============================================================================
-- course_drafts
-- =============================================================================

CREATE TABLE IF NOT EXISTS course_drafts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS course_drafts_user_id_key ON course_drafts (user_id);

-- =============================================================================
-- lessons
-- =============================================================================

CREATE TABLE IF NOT EXISTS lessons (
  id             SERIAL PRIMARY KEY,
  course_id      INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  estimated_time INTEGER,
  step_order     INTEGER DEFAULT 1,
  topics         JSONB,
  video_url      TEXT DEFAULT 'https://www.youtube.com/watch?v=lEOad0pBh9s'
);

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons (course_id);

-- =============================================================================
-- quizzes
-- =============================================================================

CREATE TABLE IF NOT EXISTS quizzes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quizzes_lesson_id_unique ON quizzes (lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes (course_id);

-- Trigger: keep quizzes.course_id in sync with lessons.course_id
CREATE OR REPLACE FUNCTION set_quizzes_course_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lesson_id IS NOT NULL THEN
    SELECT course_id INTO NEW.course_id FROM lessons WHERE id = NEW.lesson_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_set_quizzes_course_id
  BEFORE INSERT OR UPDATE OF lesson_id ON quizzes
  FOR EACH ROW EXECUTE FUNCTION set_quizzes_course_id();

-- =============================================================================
-- quiz_questions
-- =============================================================================

CREATE TABLE IF NOT EXISTS quiz_questions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id    UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  questions  JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions (quiz_id);

-- =============================================================================
-- lesson_quiz_completions
-- =============================================================================

CREATE TABLE IF NOT EXISTS lesson_quiz_completions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  quiz_id      UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT lesson_quiz_completions_user_id_lesson_id_key UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_quiz_completions_user ON lesson_quiz_completions (user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_quiz_completions_quiz ON lesson_quiz_completions (quiz_id);

-- =============================================================================
-- lesson_downloads
-- =============================================================================

CREATE TABLE IF NOT EXISTS lesson_downloads (
  id          SERIAL PRIMARY KEY,
  lesson_id   INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  file_url    TEXT NOT NULL,
  file_type   VARCHAR(50) NOT NULL,
  file_size   INTEGER,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lesson_downloads_lesson_id_idx ON lesson_downloads (lesson_id);

-- =============================================================================
-- course_enrollments
-- =============================================================================

CREATE TABLE IF NOT EXISTS course_enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  progress_id UUID,
  CONSTRAINT course_enrollments_user_id_course_id_key UNIQUE (user_id, course_id)
);

-- =============================================================================
-- course_progress
-- =============================================================================

CREATE TABLE IF NOT EXISTS course_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id       UUID NOT NULL UNIQUE REFERENCES course_enrollments(id) ON DELETE CASCADE,
  progress_percentage INTEGER DEFAULT 0,
  last_accessed       TIMESTAMPTZ DEFAULT now(),
  completed           BOOLEAN DEFAULT false,
  completed_at        TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE TRIGGER course_progress_updated_at
  BEFORE UPDATE ON course_progress
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- course_media
-- =============================================================================

CREATE TABLE IF NOT EXISTS course_media (
  id         BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  course_id  INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  provider   TEXT NOT NULL,
  url        TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_media_course_id_idx ON course_media (course_id);

-- =============================================================================
-- course_review_notes
-- =============================================================================

CREATE TABLE IF NOT EXISTS course_review_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   INTEGER NOT NULL,
  reviewer_id UUID NOT NULL,
  content     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  addressed   BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS course_review_notes_course_id_idx    ON course_review_notes (course_id);
CREATE INDEX IF NOT EXISTS course_review_notes_reviewer_id_idx  ON course_review_notes (reviewer_id);

CREATE OR REPLACE TRIGGER course_review_notes_updated_at
  BEFORE UPDATE ON course_review_notes
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- reviews
-- =============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  course_id  INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  user_name  VARCHAR(255),
  rating     NUMERIC(2,1) NOT NULL,
  comment    TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- =============================================================================
-- forum_categories
-- =============================================================================

CREATE TABLE IF NOT EXISTS forum_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  slug        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- forum_topics
-- =============================================================================

CREATE TABLE IF NOT EXISTS forum_topics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES profiles(id),
  category_id UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  pinned      BOOLEAN DEFAULT false,
  views       INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE TRIGGER forum_topics_updated_at
  BEFORE UPDATE ON forum_topics
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- forum_posts
-- =============================================================================

CREATE TABLE IF NOT EXISTS forum_posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id   UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE TRIGGER forum_posts_updated_at
  BEFORE UPDATE ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- programs
-- =============================================================================

CREATE TABLE IF NOT EXISTS programs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  thumbnail   TEXT,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  price       NUMERIC(10,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_programs_status ON programs (status);

CREATE OR REPLACE TRIGGER programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- program_courses
-- =============================================================================

CREATE TABLE IF NOT EXISTS program_courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT program_courses_program_course_unique UNIQUE (program_id, course_id)
);

-- =============================================================================
-- program_enrollments
-- =============================================================================

CREATE TABLE IF NOT EXISTS program_enrollments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id          UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  started_at          TIMESTAMPTZ DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT program_enrollments_program_user_unique UNIQUE (program_id, user_id)
);

-- =============================================================================
-- phone_registration_tickets
-- =============================================================================

CREATE TABLE IF NOT EXISTS phone_registration_tickets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash         TEXT NOT NULL UNIQUE,
  phone_e164         TEXT NOT NULL,
  full_name          TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  referral_code      TEXT,
  requested_ip       INET,
  user_agent         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at         TIMESTAMPTZ NOT NULL,
  consumed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_phone_reg_tickets_phone   ON phone_registration_tickets (phone_e164, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_reg_tickets_expires ON phone_registration_tickets (expires_at);

-- =============================================================================
-- Certification system
-- =============================================================================

CREATE TABLE IF NOT EXISTS certification_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id               INTEGER NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  enabled                 BOOLEAN NOT NULL DEFAULT false,
  passing_score           INTEGER NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
  time_per_question_minutes INTEGER NOT NULL DEFAULT 2 CHECK (time_per_question_minutes > 0),
  retry_cooldown_hours    INTEGER NOT NULL DEFAULT 48 CHECK (retry_cooldown_hours > 0),
  question_limit          INTEGER,
  verification_base_url   TEXT NOT NULL DEFAULT 'https://earn-neway.vercel.app/certverify',
  certificate_title       TEXT NOT NULL DEFAULT 'Course Certification',
  issuer_name             TEXT NOT NULL DEFAULT 'Neway',
  logo_path               TEXT NOT NULL DEFAULT '/assets/images/warkalogo.png',
  template_variant        TEXT NOT NULL DEFAULT 'premium-minimal',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER certification_settings_updated_at
  BEFORE UPDATE ON certification_settings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TABLE IF NOT EXISTS certification_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id      INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  question       TEXT NOT NULL,
  options        JSONB NOT NULL,
  correct_option INTEGER NOT NULL CHECK (correct_option >= 0),
  explanation    TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 1,
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS certification_questions_course_id_idx        ON certification_questions (course_id);
CREATE INDEX IF NOT EXISTS certification_questions_course_id_active_idx ON certification_questions (course_id, active, sort_order);

CREATE OR REPLACE TRIGGER certification_questions_updated_at
  BEFORE UPDATE ON certification_questions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TABLE IF NOT EXISTS certification_attempts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id         INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  attempt_number    INTEGER NOT NULL DEFAULT 1,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at      TIMESTAMPTZ,
  duration_seconds  INTEGER,
  score             INTEGER NOT NULL DEFAULT 0,
  passed            BOOLEAN NOT NULL DEFAULT false,
  answers           JSONB NOT NULL DEFAULT '[]',
  question_snapshot JSONB NOT NULL DEFAULT '[]',
  next_retry_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT certification_attempts_user_course_attempt_key UNIQUE (user_id, course_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS certification_attempts_user_id_idx   ON certification_attempts (user_id);
CREATE INDEX IF NOT EXISTS certification_attempts_course_id_idx ON certification_attempts (course_id);

CREATE OR REPLACE TRIGGER certification_attempts_updated_at
  BEFORE UPDATE ON certification_attempts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TABLE IF NOT EXISTS certificates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id        INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  attempt_id       UUID REFERENCES certification_attempts(id) ON DELETE SET NULL,
  certificate_code TEXT NOT NULL UNIQUE,
  verification_url TEXT NOT NULL,
  pdf_url          TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  pass_score       INTEGER NOT NULL DEFAULT 70,
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT certificates_user_course_key UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS certificates_user_id_idx          ON certificates (user_id);
CREATE INDEX IF NOT EXISTS certificates_course_id_idx        ON certificates (course_id);
CREATE INDEX IF NOT EXISTS certificates_certificate_code_idx ON certificates (certificate_code);

CREATE OR REPLACE TRIGGER certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- Referral system
-- =============================================================================

CREATE TABLE IF NOT EXISTS referral_system_settings (
  id         BOOLEAN PRIMARY KEY DEFAULT true,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

INSERT INTO referral_system_settings (id, is_active)
VALUES (true, true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS referral_profiles (
  user_id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code        TEXT NOT NULL UNIQUE,
  referral_points      INTEGER NOT NULL DEFAULT 0 CHECK (referral_points >= 0),
  successful_invites   INTEGER NOT NULL DEFAULT 0 CHECK (successful_invites >= 0),
  free_courses_awarded INTEGER NOT NULL DEFAULT 0 CHECK (free_courses_awarded >= 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_profiles_code ON referral_profiles (referral_code);

CREATE TABLE IF NOT EXISTS referral_invites (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id  UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code_used TEXT NOT NULL,
  points_awarded    INTEGER NOT NULL DEFAULT 100 CHECK (points_awarded > 0),
  status            TEXT NOT NULL DEFAULT 'qualified' CHECK (status IN ('qualified', 'rejected')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_invites_referrer ON referral_invites (referrer_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS referral_reward_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points_snapshot      INTEGER NOT NULL CHECK (points_snapshot >= 0),
  free_courses_to_award INTEGER NOT NULL CHECK (free_courses_to_award > 0),
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'activated', 'rejected')),
  admin_note           TEXT,
  requested_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  handled_at           TIMESTAMPTZ,
  handled_by           UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS referral_reward_activations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id           UUID NOT NULL UNIQUE REFERENCES referral_reward_requests(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  free_courses_awarded INTEGER NOT NULL CHECK (free_courses_awarded > 0),
  activated_by         UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  activated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_reward_codes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id       UUID NOT NULL REFERENCES referral_reward_requests(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code             TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
  created_by       UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ,
  used_at          TIMESTAMPTZ,
  used_by_user_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  used_for_course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  revoked_at       TIMESTAMPTZ,
  revoked_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  revoked_reason   TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_reward_codes_code_upper ON referral_reward_codes (UPPER(code));
CREATE INDEX IF NOT EXISTS idx_referral_reward_codes_user_status       ON referral_reward_codes (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_reward_codes_request           ON referral_reward_codes (request_id);

-- =============================================================================
-- Shop
-- =============================================================================

CREATE TABLE IF NOT EXISTS shop_products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  short_description TEXT,
  description      TEXT,
  category         TEXT NOT NULL,
  image_url        TEXT,
  price_etb        NUMERIC(10,2) NOT NULL CHECK (price_etb >= 0),
  rating           NUMERIC(3,2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count     INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  is_featured      BOOLEAN NOT NULL DEFAULT false,
  is_bestseller    BOOLEAN NOT NULL DEFAULT false,
  stock_quantity   INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_products_active_category ON shop_products (is_active, category);

CREATE OR REPLACE TRIGGER trg_shop_products_updated_at
  BEFORE UPDATE ON shop_products
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TABLE IF NOT EXISTS shop_cart_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_cart_items_user_id ON shop_cart_items (user_id);

CREATE OR REPLACE TRIGGER trg_shop_cart_items_updated_at
  BEFORE UPDATE ON shop_cart_items
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TABLE IF NOT EXISTS shop_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'cancelled', 'refunded')),
  payment_method   TEXT NOT NULL DEFAULT 'fake_checkout',
  payment_reference TEXT,
  currency         TEXT NOT NULL DEFAULT 'ETB',
  subtotal         NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  total_amount     NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_orders_user_id ON shop_orders (user_id, created_at DESC);

CREATE OR REPLACE TRIGGER trg_shop_orders_updated_at
  BEFORE UPDATE ON shop_orders
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TABLE IF NOT EXISTS shop_order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES shop_products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  unit_price   NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  line_total   NUMERIC(10,2) NOT NULL CHECK (line_total >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_order_items_order_id ON shop_order_items (order_id);

-- =============================================================================
-- Live classes
-- =============================================================================

CREATE TABLE IF NOT EXISTS live_classes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  description         TEXT,
  instructor_name     TEXT NOT NULL,
  instructor_bio      TEXT,
  instructor_avatar_url TEXT,
  cover_image_url     TEXT,
  meeting_platform    TEXT NOT NULL DEFAULT 'Zoom',
  meeting_url         TEXT,
  start_at            TIMESTAMPTZ NOT NULL,
  end_at              TIMESTAMPTZ,
  timezone            TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
  price               NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency            TEXT NOT NULL DEFAULT 'ETB',
  seats_total         INTEGER CHECK (seats_total IS NULL OR seats_total > 0),
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  registration_status TEXT NOT NULL DEFAULT 'open' CHECK (registration_status IN ('open', 'closed')),
  created_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_classes_status_start_at     ON live_classes (status, start_at);
CREATE INDEX IF NOT EXISTS idx_live_classes_registration_status ON live_classes (registration_status);

CREATE OR REPLACE TRIGGER trg_live_classes_updated_at
  BEFORE UPDATE ON live_classes
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TABLE IF NOT EXISTS live_class_registrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_class_id       UUID NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payment_status      TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method      TEXT NOT NULL DEFAULT 'demo_checkout',
  payment_reference   TEXT,
  amount_paid         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  registration_status TEXT NOT NULL DEFAULT 'registered' CHECK (registration_status IN ('registered', 'cancelled', 'waitlisted')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (live_class_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_class_reg_user_id       ON live_class_registrations (user_id);
CREATE INDEX IF NOT EXISTS idx_live_class_reg_live_class_id ON live_class_registrations (live_class_id);
CREATE INDEX IF NOT EXISTS idx_live_class_reg_created_at    ON live_class_registrations (created_at DESC);

CREATE OR REPLACE TRIGGER trg_live_class_registrations_updated_at
  BEFORE UPDATE ON live_class_registrations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
