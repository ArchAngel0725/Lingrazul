-- Lingrazul: adds fill-in-the-blank exercises to Practical Lessons steps
-- (see supabase/sql/v2_add_lesson_type.sql). One optional blank exercise
-- per lesson_section - a "step" in the click-through view can be plain
-- reading (heading/body only, unchanged) or reading + a single blank to
-- fill before moving on.
--
-- Answers are stored in BOTH scripts (answer_kana / answer_romaji), each an
-- array so more than one acceptable spelling can be listed later (e.g. a
-- word with two common romanizations) - per the "accept either" decision,
-- the app grades a typed answer correct if it matches anything in EITHER
-- array, so at least one of the two must be non-empty (enforced below).
-- decoy_words is plain display text (any script) shown alongside the real
-- answer in the tap-to-fill word bank - not itself graded against anything,
-- just has to visually read as a plausible wrong option.
--
-- Idempotent (create table if not exists) - safe to re-run. Run in the
-- Supabase SQL editor, after v2_add_lesson_type.sql.
--
-- Structure only - no blank exercises are seeded here. Example shape for
-- when a Practical Lesson gets real content (a step teaching "genki desu" -
-- "I'm fine" - with "genki"/元気 blanked out):
--
--   insert into lesson_section_blanks
--     (lesson_section_id, prompt_before, prompt_after, answer_kana, answer_romaji, decoy_words)
--   values (
--     (select id from lesson_sections where lesson_id = (select id from lessons where key = 'basic-phrases') and sort_order = 2),
--     '', ' desu.', array['元気'], array['genki'], array['忙しい', '眠い', '嬉しい']
--   );

create table if not exists lesson_section_blanks (
  id uuid primary key default gen_random_uuid(),
  lesson_section_id uuid not null references lesson_sections (id) on delete cascade,
  -- Sentence text split around the blank rather than a single template
  -- string with a placeholder token - simpler to render (just concatenate
  -- prompt_before + [blank] + prompt_after) and avoids picking/parsing a
  -- placeholder syntax that might collide with real lesson text.
  prompt_before text not null default '',
  prompt_after text not null default '',
  answer_kana text[] not null default '{}',
  answer_romaji text[] not null default '{}',
  decoy_words text[] not null default '{}',
  created_at timestamptz not null default now(),
  -- One blank per step keeps the click-through pacing simple (a step is
  -- either plain reading or reading-plus-one-check) - a lesson wanting more
  -- than one blank just uses more steps.
  constraint lesson_section_blanks_one_per_section unique (lesson_section_id),
  constraint lesson_section_blanks_has_answer check (
    array_length(answer_kana, 1) > 0 or array_length(answer_romaji, 1) > 0
  )
);

create index if not exists lesson_section_blanks_section_idx
  on lesson_section_blanks (lesson_section_id);

alter table lesson_section_blanks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'lesson_section_blanks'
      and policyname = 'Anyone can read lesson section blanks'
  ) then
    create policy "Anyone can read lesson section blanks"
      on lesson_section_blanks for select using (true);
  end if;
end $$;
