-- Lingrazul: seeds the first real Practical Lesson - "Basic Phrases",
-- everyday greetings and small talk (hello, how are you, thank you,
-- goodbye, etc.) - the content the user was brainstorming when Practical
-- Lessons was still structure-only with nothing in it.
--
-- Uses the click-through step format (v2_add_lesson_type.sql) with
-- fill-in-the-blank practice on most steps (v2_add_lesson_blanks.sql).
-- Steps 2-8 each teach one phrase and end with a blank recalling it; steps
-- 1 (intro) and 9 (review) have no blank.
--
-- Run after v2_add_lesson_type.sql and v2_add_lesson_blanks.sql.
-- Idempotent via NOT EXISTS guards - safe to re-run.


-- =========================================================================
-- 1. The lesson row - sort_order 3, right after the two Fundamentals
--    lessons (hiragana-basics=1, katakana-basics=2).
-- =========================================================================

insert into lessons (language_id, key, title, subtitle, sort_order, lesson_type)
select
  (select id from languages where code = 'ja'),
  'basic-phrases', 'Basic Phrases', 'Everyday greetings to get you started',
  3, 'practical'
where not exists (select 1 from lessons where key = 'basic-phrases');


-- =========================================================================
-- 2. Steps, in order.
-- =========================================================================

insert into lesson_sections (lesson_id, sort_order, heading, body)
select l.id, v.sort_order, v.heading, v.body
from lessons l
cross join (values
  (1, 'Getting Started',
   'A handful of short phrases will get you through most everyday interactions - greeting someone, asking how they are, saying thank you, and saying goodbye. This lesson walks through seven useful phrases, one at a time, with a quick practice after each one.'),
  (2, 'Hello',
   'こんにちは (konnichiwa) is the standard way to say hello during the day, roughly late morning through evening. Different greetings exist for morning and night specifically, but this one is safe in between.'),
  (3, 'How Are You?',
   'お元気ですか (ogenki desu ka) means how are you, literally closer to are you well. The か at the end turns a sentence into a question, similar to a question mark.'),
  (4, 'I Am Fine',
   '元気です (genki desu) means I am fine or I am well - the natural reply to お元気ですか above. です is a polite way of saying is, am, or are.'),
  (5, 'Thank You',
   'ありがとうございます (arigatou gozaimasu) is the polite, complete form of thank you. The shorter ありがとう (arigatou) is common with friends, but ございます is safer with someone you have just met.'),
  (6, 'Nice to Meet You',
   'はじめまして (hajimemashite) is said specifically the first time you meet someone - it does not get reused in later conversations with that same person.'),
  (7, 'What Is Your Name?',
   'お名前は何ですか (onamae wa nan desu ka) means what is your name. 何 (なん / なに) means what - the same character shows up any time a sentence asks about an unknown thing.'),
  (8, 'Goodbye',
   'さようなら (sayounara) is a fairly formal goodbye - it can suggest a longer parting, so it shows up more in movies and textbooks than between friends who will see each other tomorrow. Still, it is the standard one to know first.'),
  (9, 'Review',
   'That is seven phrases: hello, how are you, I am fine, thank you, nice to meet you, what is your name, and goodbye - enough to carry a short first conversation. Come back and replay this lesson any time as a refresher.')
) as v(sort_order, heading, body)
where l.key = 'basic-phrases'
  and not exists (
    select 1 from lesson_sections ls where ls.lesson_id = l.id and ls.sort_order = v.sort_order
  );


-- =========================================================================
-- 3. Fill-in-the-blank practice for steps 2-8. Decoys are drawn from the
--    OTHER phrases in this same lesson (real content, not filler), so the
--    word bank gets more meaningfully challenging as more phrases have
--    been introduced.
-- =========================================================================

insert into lesson_section_blanks (lesson_section_id, prompt_before, prompt_after, answer_kana, answer_romaji, decoy_words)
select ls.id, v.prompt_before, v.prompt_after, v.answer_kana, v.answer_romaji, v.decoy_words
from lesson_sections ls
join lessons l on l.id = ls.lesson_id
cross join (values
  (2, 'Hello → ', '',
   array['こんにちは'], array['konnichiwa'],
   array['さようなら', 'ありがとうございます', 'はじめまして']),
  (3, 'How are you? → ', '',
   array['お元気ですか'], array['ogenki desu ka', 'o genki desu ka'],
   array['こんにちは', '元気です', 'さようなら']),
  (4, 'I am fine → ', '',
   array['元気です'], array['genki desu'],
   array['お元気ですか', 'ありがとうございます', 'はじめまして']),
  (5, 'Thank you → ', '',
   array['ありがとうございます', 'ありがとう'], array['arigatou gozaimasu', 'arigatougozaimasu', 'arigatou'],
   array['こんにちは', 'さようなら', '元気です']),
  (6, 'Nice to meet you → ', '',
   array['はじめまして'], array['hajimemashite'],
   array['お名前は何ですか', 'こんにちは', 'さようなら']),
  (7, 'What is your name? → ', '',
   array['お名前は何ですか'], array['onamae wa nan desu ka', 'o namae wa nan desu ka'],
   array['はじめまして', '元気です', 'ありがとうございます']),
  (8, 'Goodbye → ', '',
   array['さようなら'], array['sayounara', 'sayonara'],
   array['こんにちは', 'お元気ですか', 'ありがとうございます'])
) as v(sort_order, prompt_before, prompt_after, answer_kana, answer_romaji, decoy_words)
where l.key = 'basic-phrases'
  and ls.sort_order = v.sort_order
  and not exists (
    select 1 from lesson_section_blanks b where b.lesson_section_id = ls.id
  );
