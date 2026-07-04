// ALark-Claude_Review@MEGADATA
// offline.tsx - Offline flashcard session screen
// Loads cards from Supabase on mount, manages the active queue,
// and clears all session state when the user navigates away.

import { useEffect, useState, useCallback } from 'react';
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

    // Fetch 10 study cards and 20 decoy words separately
    const studyCards = await fetchFlashCards(10);
    const decoyCards = await fetchFlashCards(20);
    const decoyWords = decoyCards.map(c => c.nativeLanguage);

    // Initialize the queue with study cards and decoy word pool
    initQueue(studyCards, decoyWords);

    // Show the first card
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

    // Always show the first card in the queue
    const next = queue[0].card;
    setCurrentCard(next);

    // Build multiple choice options - 1 correct + 3 decoys, shuffled
    const decoys = getDecoys(next.nativeLanguage);
    const allChoices = [next.nativeLanguage, ...decoys];
    const shuffled = allChoices.sort(() => Math.random() - 0.5);
    setChoices(shuffled);
  };

  // --- Called when user taps the correct answer ---
  const handleCorrect = () => {
    if (!currentCard) return;

    // Mark correct in queue - may rest the card if threshold reached
    markCorrect(currentCard.id);

    // Check if queue needs refilling (dropped to 50%)
    if (needsRefill()) {
      fetchFlashCards(5).then(newCards => {
        addCards(newCards);
      });
    }

    // Advance to next card
    showNextCard();
  };

  // --- Clear all session state when user leaves the tab ---
  useFocusEffect(
    useCallback(() => {
      // Tab is focused - load a fresh session
      loadSession();

      return () => {
        // Tab lost focus - wipe the queue
        clearQueue();
      };
    }, [])
  );

  // --- Render states ---
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
      {/* Queue progress indicator */}
      <Text style={styles.progress}>
        {getActiveCards().length} cards remaining
      </Text>

      {/* The flashcard with multiple choice */}
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