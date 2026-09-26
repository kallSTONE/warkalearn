-- Add course_id to quizzes and auto-populate from lessons
-- This migration:
-- 1) Adds column public.quizzes.course_id
-- 2) Backfills from public.lessons.course_id based on quizzes.lesson_id
-- 3) Adds NOT NULL + FK constraint to public.courses(id)
-- 4) Creates trigger to auto-set course_id on INSERT/UPDATE of lesson_id

BEGIN;

-- 1) Add column (nullable first for safe backfill)
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS course_id INTEGER;

-- 2) Backfill course_id from related lesson
UPDATE public.quizzes q
SET course_id = l.course_id
FROM public.lessons l
WHERE l.id = q.lesson_id
  AND (q.course_id IS DISTINCT FROM l.course_id);

-- Optional validation: ensure no NULL course_id remain due to lessons without course linkage
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.quizzes q
    LEFT JOIN public.lessons l ON l.id = q.lesson_id
    WHERE q.course_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot set NOT NULL on quizzes.course_id: some rows could not be backfilled (ensure lessons.course_id is set)';
  END IF;
END$$;

-- 3) Enforce NOT NULL and add FK constraint to courses
ALTER TABLE public.quizzes
  ALTER COLUMN course_id SET NOT NULL;

-- Add FK (idempotent-ish: drop if exists then add)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.quizzes'::regclass
      AND conname = 'quizzes_course_id_fkey'
  ) THEN
    ALTER TABLE public.quizzes DROP CONSTRAINT quizzes_course_id_fkey;
  END IF;
END$$;

ALTER TABLE public.quizzes
  ADD CONSTRAINT quizzes_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES public.courses (id)
  ON DELETE CASCADE;

-- Helpful index for querying by course
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);

-- 4) Trigger to auto-populate course_id based on lesson_id
CREATE OR REPLACE FUNCTION public.set_quizzes_course_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.lesson_id IS NOT NULL THEN
    SELECT l.course_id INTO NEW.course_id
    FROM public.lessons l
    WHERE l.id = NEW.lesson_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_quizzes_course_id ON public.quizzes;
CREATE TRIGGER trg_set_quizzes_course_id
BEFORE INSERT OR UPDATE OF lesson_id ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.set_quizzes_course_id();

-- Also keep quizzes.course_id in sync if a lesson's course_id changes
CREATE OR REPLACE FUNCTION public.propagate_lesson_course_to_quizzes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.course_id IS DISTINCT FROM OLD.course_id THEN
    UPDATE public.quizzes q
    SET course_id = NEW.course_id
    WHERE q.lesson_id = NEW.id;
  END IF;
  RETURN NULL; -- AFTER trigger, no row modification needed
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_lesson_course_to_quizzes ON public.lessons;
CREATE TRIGGER trg_propagate_lesson_course_to_quizzes
AFTER UPDATE OF course_id ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.propagate_lesson_course_to_quizzes();

COMMIT;
