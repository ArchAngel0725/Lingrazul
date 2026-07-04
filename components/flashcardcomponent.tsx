// ALark-Claude_Review@MEGADATA
// FlashCardComponent.tsx - Renders a flashcard with vanishing multiple choice options
// Wrong answers disappear on tap, correct answer advances to next card

import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FlashCard } from '../lib/cards';

interface Props {
  card: FlashCard;
  choices: string[];
  onCorrect: () => void;
  onKnow: () => void;
  onNoIdea: () => void;
}

export default function FlashCardComponent({ card, choices, onCorrect, onKnow, onNoIdea }: Props) {
  // Track which choices are still visible - wrong ones vanish on tap
  const [visibleChoices, setVisibleChoices] = useState<string[]>(choices);

  // Reset visible choices whenever the card changes
  useEffect(() => {
    setVisibleChoices(choices);
  }, [card.id, choices]);

  const handleChoice = (choice: string) => {
    if (choice === card.nativeLanguage) {
      // Correct answer - advance
      onCorrect();
    } else {
      // Wrong answer - vanish it silently
      setVisibleChoices(prev => prev.filter(c => c !== choice));
    }
  };

  return (
    <View style={styles.container}>

      {/* The card face - shows the Japanese word */}
      <View style={styles.card}>
        <Text style={styles.mainText}>{card.learningLanguage}</Text>
        <Text style={styles.category}>{card.category}</Text>
      </View>

      {/* Multiple choice options */}
      <View style={styles.choicesContainer}>
        {visibleChoices.map((choice, index) => (
          <TouchableOpacity
            key={index}
            style={styles.choiceButton}
            onPress={() => handleChoice(choice)}
          >
            <Text style={styles.choiceText}>{choice}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Algorithm signal buttons - shown below choices */}
      <View style={styles.algorithmButtons}>
        <TouchableOpacity style={styles.noIdea} onPress={onNoIdea}>
          <Text style={styles.algorithmText}>Too hard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.know} onPress={onKnow}>
          <Text style={styles.algorithmTextDark}>Too easy</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    minHeight: 200,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 32,
  },
  mainText: {
    fontSize: 72,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  category: {
    fontSize: 12,
    color: '#444444',
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  choicesContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
    marginBottom: 32,
  },
  choiceButton: {
    backgroundColor: '#1a1a1a',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  choiceText: {
    color: '#ffffff',
    fontSize: 16,
  },
  algorithmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 400,
  },
  noIdea: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  know: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  algorithmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  algorithmTextDark: {
    color: '#0a0a0a',
    fontSize: 14,
    fontWeight: 'bold',
  },
});