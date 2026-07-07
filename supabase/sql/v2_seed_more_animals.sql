-- Lingrazul: adds more content to the "animals" word category, which has
-- only ever had the 2 smoke-test rows (猫/犬, cat/dog) from
-- v2_seed_test_data.sql - the real bulk word migration never added
-- anything here since the old live data's categories didn't include an
-- "animals" bucket. This is a pure content-authoring pass, not a schema
-- change.
--
-- Idempotent: a word only gets inserted if it doesn't already exist in
-- this category (matched by text), and a translation only gets inserted
-- alongside a word that was newly inserted this run - safe to re-run.
--
-- Depends on: v2_content_schema.sql, v2_seed_test_data.sql (creates the
-- 'animals' category this targets).
--
-- Run in the Supabase SQL editor.

with animal_data (jp_text, en_translation) as (
  values
    ('鳥', 'bird'),
    ('魚', 'fish'),
    ('馬', 'horse'),
    ('牛', 'cow'),
    ('豚', 'pig'),
    ('羊', 'sheep'),
    ('うさぎ', 'rabbit'),
    ('象', 'elephant'),
    ('熊', 'bear'),
    ('猿', 'monkey'),
    ('ライオン', 'lion'),
    ('パンダ', 'panda')
),
target as (
  select
    c.id as category_id,
    (select id from languages where code = 'ja') as ja_id,
    (select id from languages where code = 'en') as en_id
  from categories c
  where c.key = 'animals'
    and c.content_type = 'word'
    and c.language_id = (select id from languages where code = 'ja')
),
inserted_words as (
  insert into words (language_id, category_id, text, difficulty, tags)
  select target.ja_id, target.category_id, ad.jp_text, 1, '{"animals"}'
  from animal_data ad, target
  where not exists (
    select 1 from words w
    where w.text = ad.jp_text and w.category_id = target.category_id
  )
  returning id, text
)
insert into word_translations (word_id, target_language_id, translation, is_primary)
select iw.id, target.en_id, ad.en_translation, true
from inserted_words iw
join animal_data ad on ad.jp_text = iw.text
cross join target;
