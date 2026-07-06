-- Lingrazul: seeds the first two Basics-tab lessons - hiragana, then
-- katakana - textbook-standard ordering (script fundamentals before any
-- grammar/vocab lesson gets written). Original content, written for this
-- app, not copied from any specific textbook.
--
-- Depends on: v2_content_schema.sql (languages), v2_lessons_schema.sql
-- (lessons, lesson_sections). Safe to re-run - deletes these two lessons
-- (and their sections, via cascade) by key before re-inserting.
--
-- Run in the Supabase SQL editor.

delete from lessons where key in ('hiragana-basics', 'katakana-basics');

-- =========================================================================
-- Lesson 1: Hiragana: The Basics
-- =========================================================================

with new_lesson as (
  insert into lessons (language_id, key, title, subtitle, sort_order)
  select id, 'hiragana-basics', 'Hiragana: The Basics',
         'The phonetic script behind every Japanese sentence.', 1
  from languages where code = 'ja'
  returning id
)
insert into lesson_sections (lesson_id, sort_order, heading, body)
select id, 1, 'What Is Hiragana?', $$Hiragana is one of the scripts used to write Japanese, and it is a syllabary rather than an alphabet. Instead of each character standing for a single consonant or vowel sound on its own, each hiragana character stands for one full syllable, like "a", "ka", or "shi".

Hiragana is used for native Japanese words, grammar particles that glue sentences together, and the endings of words that change form (like verb conjugations). Where kanji carries meaning, hiragana carries sound - it is the script that makes the rest of a sentence readable even before you know many kanji.$$
from new_lesson
union all
select id, 2, 'The Five Vowels', $$Everything in hiragana builds on five vowel sounds: a, i, u, e, o - written あ, い, う, え, お.

These are pure, consistent sounds, roughly: "ah" (as in father), "ee" (as in see), "oo" (as in food), "eh" (as in bed), and "oh" (as in go). Unlike English vowels, they do not change depending on the word - あ is always "ah", never "ay". Once these five sounds feel natural, the rest of the hiragana chart is much easier, because almost every other character is a consonant combined with one of these five vowels.$$
from new_lesson
union all
select id, 3, 'Building the Rest of the Chart', $$Once you know the five vowels, the rest of hiragana follows a pattern: each row pairs one consonant with all five vowel sounds. The k-row is か (ka), き (ki), く (ku), け (ke), こ (ko). The s-row is さ (sa), し (shi), す (su), せ (se), そ (so). This continues through t, n, h, m, y, r, and w rows.

A few sounds are irregular (し is "shi" not "si", つ is "tsu" not "tu"), but the overall shape - one consonant, five vowel endings - holds for almost the entire chart. Recognizing this pattern makes memorizing hiragana much faster than treating each character as unrelated to the others.$$
from new_lesson
union all
select id, 4, 'Dakuten and Handakuten', $$Two small marks change certain consonant sounds. A dakuten (゛) voices a consonant: か (ka) becomes が (ga), た (ta) becomes だ (da), は (ha) becomes ば (ba). A handakuten (゜) - only used on the h-row - turns は (ha) into ぱ (pa).

These marked versions are not new characters to memorize from scratch - they are the same base character with a small, predictable shift in sound.$$
from new_lesson
union all
select id, 5, 'Practicing', $$Head to the Flash Cards tab and select the hiragana categories to start drilling these. Romaji (the Latin-letter spelling, like "ka" or "shi") is shown as a learning aid throughout the app - it is not part of real Japanese writing, just a pronunciation guide while the actual hiragana characters become familiar.$$
from new_lesson;


-- =========================================================================
-- Lesson 2: Katakana: The Basics
-- =========================================================================

with new_lesson as (
  insert into lessons (language_id, key, title, subtitle, sort_order)
  select id, 'katakana-basics', 'Katakana: The Basics',
         'Same sounds as hiragana, a different set of shapes.', 2
  from languages where code = 'ja'
  returning id
)
insert into lesson_sections (lesson_id, sort_order, heading, body)
select id, 1, 'What Is Katakana?', $$Katakana represents exactly the same sounds as hiragana - the same five vowels, the same row structure - but uses a completely different, more angular set of characters.

Katakana's main job is writing words borrowed from other languages, foreign names, and onomatopoeia, and it is also sometimes used the way English uses italics, to add emphasis to a native Japanese word. If a word in Japanese text looks unfamiliar and angular rather than rounded, there is a good chance it is a loanword written in katakana.$$
from new_lesson
union all
select id, 2, 'Same Sounds, New Shapes', $$The five katakana vowels are ア, イ, ウ, エ, オ - and they sound identical to hiragana's あ, い, う, え, お (a, i, u, e, o). Every other katakana character follows the same consonant-plus-vowel row pattern hiragana does: カ (ka), キ (ki), ク (ku), ケ (ke), コ (ko), and so on.

This means learning katakana is less about learning new sounds and more about learning a second set of shapes for sounds you may already recognize from hiragana.$$
from new_lesson
union all
select id, 3, 'Reading Loanwords', $$Katakana words are often close approximations of how a foreign word sounds, adapted to fit Japanese syllables. コーヒー (ko-hi-) is "coffee". ホテル (hoteru) is "hotel". The long dash ー is a long-vowel mark - it stretches out the vowel sound that comes before it, rather than being its own separate sound.

Reading katakana loanwords out loud, and listening for the English (or other source-language) word hiding inside the Japanese pronunciation, is one of the fastest ways to get comfortable with this script.$$
from new_lesson
union all
select id, 4, 'Dakuten Works the Same Way', $$The same voicing marks from hiragana apply here: dakuten (゛) turns カ (ka) into ガ (ga), and so on through the same rows. If a dakuten pattern from the hiragana lesson felt familiar, it carries over directly - nothing new to relearn.$$
from new_lesson
union all
select id, 5, 'Practicing', $$Head to the Flash Cards tab and select the katakana categories to start drilling these. Many katakana rows share the exact same romaji as their hiragana counterpart (カ and か both romanize to "ka") - the app tracks them as separate characters, so getting one right does not automatically mean you know the other.$$
from new_lesson;
