// ALark-Claude_Review@MEGADATA
// offline.tsx - Offline flashcard session screen
// Loads cards from Supabase on mount, manages the active queue,
// and clears all session state when the user navigates away.

import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import FlashCardComponent from '../../components/flashcardcomponent';
import { FlashCard } from '../../lib/cards';
import { fetchFlashCards } from '../../lib/cardCashe';
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

export default function OfflineScreen() {
  const [loading, setLoading] = useState(true);
  const [currentCard, setCurrentCard] = useState<FlashCard | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [sessionDone, setSessionDone] = useState(false);

  // --- Load initial cards and word pool from Supabase ---
  const loadSession = async () => {
    setLoading(true);
    setSessionDone(false);

    // Fetch 20 study cards and 20 decoy words separately
    const studyCards = await fetchFlashCards(20);
    const decoyCards = await fetchFlashCards(20);
    const decoyWords = decoyCards.map(c => c.nativeLanguage);

    initQueue(studyCards, decoyWords);
    showNextCard();
    setLoading(false);
  };

  // --- Pick the next card from the front of the queue ---
  const showNextCard = () => {
    const queue = getActiveCards();

    if (queue.length === 0) {
      setSessionDone(true);
      return;
    }

    const next = queue[0].card;
    setCurrentCard(next);

    // Build multiple choice - 1 correct + 3 decoys shuffled
    const decoys = getDecoys(next.nativeLanguage);
    const allChoices = [next.nativeLanguage, ...decoys];
    const shuffled = allChoices.sort(() => Math.random() - 0.5);
    setChoices(shuffled);
  };

  // --- Called when user taps the correct answer ---
  const handleCorrect = () => {
    if (!currentCard) return;
    markCorrect(currentCard.id);
    shuffleCurrentToBack();
    if (needsRefill()) {
      fetchFlashCards(10).then(newCards => addCards(newCards));
    }
    showNextCard();
  };

  // --- Clear session state when user leaves the tab ---
  useFocusEffect(
    useCallback(() => {
      loadSession();
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
      <FlashCardComponent
        card={currentCard}
        choices={choices}
        onCorrect={handleCorrect}
        onKnow={() => {}}
        onNoIdea={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 24,
  },
  center: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
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