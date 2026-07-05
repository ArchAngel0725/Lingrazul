// ALark-Claude_Review@MEGADATA
// offline.tsx - Offline flashcard session screen with category selector
// Three column layout: categories | flashcard | empty
// Supports both word cards (FlashCard) and letter cards (LetterCard)

import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import FlashCardComponent from '../../components/flashcardcomponent';
import { FlashCard, LetterCard } from '../../lib/cards';
import { fetchFlashCards, fetchLetterCards } from '../../lib/cardCashe';
import {
  initQueue,
  markCorrect,
  needsRefill,
  getActiveCards,
  addCards,
  clearQueue,
  getDecoys,
  shuffleCurrentToBack,
} from '../../lib/cardQueue';
import { supabase } from '../../lib/supabase';

const ALL_CATEGORIES = [
  'demonstrative',
  'kosoado',
  'particle',
  'verb',
];

const LETTER_CATEGORIES = [
  'vowel', 'k-row', 's-row', 't-row', 'n-row',
  'h-row', 'm-row', 'y-row', 'r-row', 'w-row',
  'n-standalone', 'dakuten', 'handakuten'
];

const LETTER_MODES = [
  { question: 'hiragana', answer: 'romaji' },
  { question: 'katakana', answer: 'romaji' },
  { question: 'romaji', answer: 'hiragana' },
  { question: 'romaji', answer: 'katakana' },
  { question: 'hiragana', answer: 'katakana' },
  { question: 'katakana', answer: 'hiragana' },
] as const;

export default function OfflineScreen() {
  const [loading, setLoading] = useState(true);
  const [currentCard, setCurrentCard] = useState<FlashCard | LetterCard | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [sessionDone, setSessionDone] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(ALL_CATEGORIES);
  const [categories, setCategories] = useState<string[]>(ALL_CATEGORIES);
  const [muted, setMuted] = useState(false);
  const [selectedLetterCategories, setSelectedLetterCategories] = useState<string[]>([]);
  const [selectedModes, setSelectedModes] = useState<typeof LETTER_MODES[number][]>([LETTER_MODES[0]]);

  // --- Fetch available word categories from Supabase ---
  const loadCategories = async () => {
    const { data } = await supabase
      .from('word_descriptions')
      .select('category');

    if (data) {
      const unique = [...new Set(data.map(d => d.category))] as string[];
      setCategories(unique);
      setSelectedCategories(unique);
    }
  };

  // --- Toggle a word category on/off ---
  const handleCategoryToggle = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // --- Get correct answer text from any card type ---
  const getCorrectAnswer = (card: FlashCard | LetterCard): string => {
    if (card.cardType === 'letter') {
      return (card as any)[card.answerScript];
    }
    return (card as FlashCard).nativeLanguage;
  };

  // --- Load session - fetches word cards, letter cards, and decoy pools ---
  const loadSession = async () => {
    setLoading(true);
    setSessionDone(false);

    // Fetch word cards if any word categories selected
    const studyCards = selectedCategories.length > 0
      ? await fetchFlashCards(20, selectedCategories)
      : [];

    // Fetch letter cards if any letter categories selected
    const letterCards = selectedLetterCategories.length > 0
      ? await fetchLetterCards(20, selectedModes, selectedLetterCategories)
      : [];

    // Combine and shuffle both together
    const allCards = [...studyCards, ...letterCards]
      .sort(() => Math.random() - 0.5);

    // Fetch word decoys
    const decoyCards = await fetchFlashCards(20, selectedCategories.length > 0 ? selectedCategories : undefined);
    const decoyWords = decoyCards.map(c => c.nativeLanguage);

    // Fetch letter decoys if letters selected
    const letterDecoyPool: string[] = [];
    if (selectedLetterCategories.length > 0) {
      const letterDecoys = await fetchLetterCards(30, selectedModes, selectedLetterCategories);
      letterDecoys.forEach(c => {
        letterDecoyPool.push((c as any)[c.answerScript]);
      });
    }

    initQueue(allCards, decoyWords, letterDecoyPool);
    showNextCard();
    setLoading(false);
  };

  // --- Pick the next card from the front of the queue ---
  const showNextCard = () => {
    const queue = getActiveCards();

    if (queue.length === 0) {
      fetchFlashCards(10, selectedCategories).then(newCards => {
        if (newCards.length === 0) {
          setSessionDone(true);
          return;
        }
        addCards(newCards);
        showNextCard();
      });
      return;
    }

    const next = queue[0].card;
    setCurrentCard(next);

    // Get correct answer based on card type
    const correctAnswer = getCorrectAnswer(next);

    // Build choices - 1 correct + 3 decoys shuffled
    const decoys = getDecoys(correctAnswer, next.cardType);
    const allChoices = [correctAnswer, ...decoys];
    const shuffled = allChoices.sort(() => Math.random() - 0.5);
    setChoices(shuffled);
  };

  // --- Called when user taps the correct answer ---
  const handleCorrect = () => {
    if (!currentCard) return;
    markCorrect(currentCard.id);
    shuffleCurrentToBack();
    if (needsRefill()) {
      fetchFlashCards(10, selectedCategories).then(newCards => {
        addCards(newCards);
      });
    }
    showNextCard();
  };

  // --- Clear session state when user leaves the tab ---
  useFocusEffect(
    useCallback(() => {
      loadCategories().then(() => loadSession());
      return () => clearQueue();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ffffff" size="large" />
        <Text style={styles.loadingText}>Loading cards...</Text>
      </View>
    );
  }

  if (sessionDone) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneText}>セッション完了</Text>
        <Text style={styles.doneSubText}>Session complete!</Text>
        <TouchableOpacity style={styles.restartButton} onPress={loadSession}>
          <Text style={styles.restartText}>Start Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentCard) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>
        {getActiveCards().length} cards remaining
      </Text>

      <View style={styles.columns}>

        {/* Left panel - category toggles */}
        <View style={styles.leftPanel}>
          <Text style={styles.panelTitle}>Categories</Text>
          <ScrollView style={styles.categoryList}>

            {/* Word categories */}
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategories.includes(cat) && styles.categoryChipActive,
                ]}
                onPress={() => handleCategoryToggle(cat)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategories.includes(cat) && styles.categoryTextActive,
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Letters section */}
            <Text style={[styles.panelTitle, { marginTop: 16 }]}>Letters</Text>
            {LETTER_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedLetterCategories.includes(cat) && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedLetterCategories(prev =>
                  prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                )}
              >
                <Text style={[
                  styles.categoryText,
                  selectedLetterCategories.includes(cat) && styles.categoryTextActive,
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Mode selection - only show if letters selected */}
            {selectedLetterCategories.length > 0 && (
              <>
                <Text style={[styles.panelTitle, { marginTop: 16 }]}>Mode</Text>
                {LETTER_MODES.map((mode, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.categoryChip,
                      selectedModes.includes(mode) && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedModes(prev =>
                      prev.includes(mode)
                        ? prev.filter(m => m !== mode)
                        : [...prev, mode]
                    )}
                  >
                    <Text style={[
                      styles.categoryText,
                      selectedModes.includes(mode) && styles.categoryTextActive,
                    ]}>
                      {mode.question} → {mode.answer}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

          </ScrollView>

          <TouchableOpacity style={styles.applyButton} onPress={loadSession}>
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>

        {/* Center - card box with mute button */}
        <View style={styles.centerPanel}>
          <View style={styles.cardBox}>
            <View style={styles.cardBoxHeader}>
              <TouchableOpacity
                style={styles.muteButton}
                onPress={() => setMuted(m => !m)}
              >
                <Text style={styles.muteText}>{muted ? '🔇' : '🔊'}</Text>
              </TouchableOpacity>
            </View>
            <FlashCardComponent
              card={currentCard}
              choices={choices}
              onCorrect={handleCorrect}
              onKnow={() => {}}
              onNoIdea={() => {}}
              muted={muted}
            />
          </View>
        </View>

        {/* Right panel - empty for now */}
        <View style={styles.rightPanel} />

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 8,
  },
  center: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    width: 200,
    backgroundColor: '#111111',
    borderRightWidth: 1,
    borderRightColor: '#1a1a1a',
    padding: 16,
    justifyContent: 'space-between',
  },
  categoryList: {
    flex: 1,
    gap: 8,
  },
  centerPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cardBox: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 16,
    flex: 1,
    maxHeight: 720,
  },
  cardBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  muteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  muteText: {
    fontSize: 16,
  },
  rightPanel: {
    width: 200,
    backgroundColor: '#111111',
    borderLeftWidth: 1,
    borderLeftColor: '#1a1a1a',
  },
  panelTitle: {
    color: '#555555',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  categoryChip: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#1a1a1a',
  },
  categoryChipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  categoryText: {
    color: '#555555',
    fontSize: 13,
    textTransform: 'capitalize',
  },
  categoryTextActive: {
    color: '#0a0a0a',
    fontWeight: 'bold',
  },
  applyButton: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  applyText: {
    color: '#0a0a0a',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingText: {
    color: '#555555',
    fontSize: 14,
    marginTop: 12,
  },
  doneText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  doneSubText: {
    color: '#888888',
    fontSize: 18,
  },
  restartButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  restartText: {
    color: '#0a0a0a',
    fontWeight: 'bold',
    fontSize: 16,
  },
  progress: {
    color: '#444444',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
});