// ALark-Claude_Review@MEGADATA
import { supabase } from './supabase';
import { FlashCard } from './cards';

export async function fetchFlashCards(limit: number = 4): Promise<FlashCard[]> {
  // Fetch random rows from word_descriptions
  const { data: descriptions, error } = await supabase
    .from('word_descriptions')
    .select('*')
    .limit(limit);

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