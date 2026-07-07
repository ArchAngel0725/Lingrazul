-- Lingrazul: adds a lesson_type column to `lessons`, distinguishing the
-- existing hand-authored reading lessons ("Fundamentals" - hiragana-basics,
-- katakana-basics) from a new "Practical Lessons" category (real-world
-- scenario lessons - ordering food, asking directions, etc.) shown in a
-- click-through, one-step-at-a-time layout instead of the Fundamentals
-- tab's single scrolling page.
--
-- Deliberately reuses the existing `lessons`/`lesson_sections` tables
-- rather than adding new ones - a Practical Lesson's "steps" are just its
-- lesson_sections rows in sort_order, read one at a time client-side. No
-- schema change was needed for the click-through behavior itself, only for
-- distinguishing which lessons should render that way.
--
-- Existing rows (hiragana-basics, katakana-basics) get 'fundamentals' via
-- the column default - Postgres backfills a NOT NULL + DEFAULT column add
-- in the same statement, no separate UPDATE needed.
--
-- Idempotent (add column if not exists) - safe to re-run. Run in the
-- Supabase SQL editor, after v2_lessons_schema.sql.
--
-- Structure only - no Practical Lessons content is seeded here. Insert
-- real lessons the same way v2_seed_lessons.sql did for Fundamentals, just
-- with lesson_type = 'practical':
--
--   insert into lessons (language_id, key, title, subtitle, sort_order, lesson_type)
--   values (
--     (select id from languages where code = 'ja'),
--     'ordering-food', 'Ordering Food', 'Phrases for restaurants and cafes',
--     0, 'practical'
--   );
--   -- then lesson_sections rows as usual, one per step, in sort_order.

alter table lessons
  add column if not exists lesson_type text not null default 'fundamentals'
    check (lesson_type in ('fundamentals', 'practical'));
