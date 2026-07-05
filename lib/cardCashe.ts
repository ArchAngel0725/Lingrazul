// ALark-Claude_Review@MEGADATA
import { supabase } from './supabase';
import { FlashCard, LetterCard } from './cards';
export async function fetchFlashCards(limit: number = 20, categories?: string[]): Promise<FlashCard[]> {
  // Fetch random rows from word_descriptions
  let query = supabase
    .from('word_descriptions')
    .select('*')
    .limit(limit);

      // Filter by categories if provided
  if (categories && categories.length > 0) {
    query = query.in('category', categories);
  }

const { data: descriptions, error } = await query;
  if (error || !descriptions) {
    console.error('Failed to fetch descriptions:', error);
    return [];
  }

  // Get the IDs to fetch matching words
  const ids = descriptions.map(d => d.id);

  // Fetch matching japanese and english words
  const { data: japanese } = await supabase
    .from('words_japanese')
    .select('*')
    .in('id', ids);

  const { data: english } = await supabase
    .from('words_english')
    .select('*')
    .in('id', ids);

  if (!japanese || !english) return [];

  // Factory each description into a FlashCard
  const cards: FlashCard[] = descriptions.map(desc => {
    const jp = japanese.find(j => j.id === desc.id);
    const en = english.find(e => e.id === desc.id);

    return {
      id: desc.id,
      cardType: 'flash',
      difficulty: desc.difficulty,
      category: desc.category,
      language: 'ja',
      tags: desc.tags ?? [],
      learningLanguage: jp?.text ?? '',
      reading: '',
      nativeLanguage: en?.text ?? '',
    };
  });

  return cards;
}// ALark-Claude_Review@MEGADATA
// Fetches letter cards from letters_japanese table
// mode determines which script is shown as question and which is the answer
export async function fetchLetterCards(
  limit: number = 20,
  modes: { question: 'hiragana' | 'katakana' | 'romaji', answer: 'hiragana' | 'katakana' | 'romaji' }[],
  categories?: string[]
): Promise<LetterCard[]> {
  let query = supabase
    .from('letters_japanese')
    .select('*')
    .limit(limit);

  if (categories && categories.length > 0) {
    query = query.in('category', categories);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Failed to fetch letters:', error);
    return [];
  }

  // For each row pick a random mode from the enabled modes
  const cards: LetterCard[] = data.map(row => {
    const mode = modes[Math.floor(Math.random() * modes.length)];
    return {
      id: row.id,
      cardType: 'letter',
      difficulty: row.difficulty,
      category: row.category,
      language: 'ja',
      tags: row.tags ?? [],
      hiragana: row.hiragana,
      katakana: row.katakana,
      romaji: row.romaji,
      questionScript: mode.question,
      answerScript: mode.answer,
    };
  });

  return cards;
}