// ALark-Claude_Review@MEGADATA
// FlashCardComponent.tsx - Renders a flashcard with vanishing multiple choice options
// Wrong answers disappear on tap, correct answer advances to next card

import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FlashCard } from '../lib/cards';
import * as Speech from 'expo-speech';

const CELEBRATION_PHRASES = [
  'すごい！', 'すごいね！', 'やるじゃん！', 'さすが！', 'かっこいい！',
  'やばい！', 'マジで！', 'うわあ！', 'いいね！', 'よくできました！',
  'その通り！', '正解！', '合ってる！', 'バッチリ！', '完璧！',
  'よし！', 'パーフェクト！', 'ナイス！', 'ブラボー！', '天才！',
  '神！', 'やるね！', 'さすがだね！', 'もちろん！', 'えらい！',
  'よかった！', '上手！', '頑張ったね！', '素晴らしい！', '最高！',
];

interface Props {
  card: FlashCard;
  choices: string[];
  onCorrect: () => void;
  onKnow: () => void;
  onNoIdea: () => void;
}

export default function FlashCardComponent({ card, choices, onCorrect, onKnow, onNoIdea }: Props) {
  const [visibleChoices, setVisibleChoices] = useState<string[]>(choices);
  const [wrongCount, setWrongCount] = useState(0);

  useEffect(() => {
    setVisibleChoices(choices);
    setWrongCount(0);
  }, [card.id, choices]);

  // wrongCount penalty lowers pitch/rate the more wrong answers were given
  const speakCelebration = (count: number) => {
    const phrase = CELEBRATION_PHRASES[Math.floor(Math.random() * CELEBRATION_PHRASES.length)];
    const penalty = count * 0.05;
    const pitch = Math.max(0.5, (0.9 + Math.random() * 0.1) - penalty);
    const rate = Math.max(0.5, (0.9 + Math.random() * 0.1) - penalty);
    Speech.speak(phrase, { language: 'ja', pitch, rate });
  };

  const handleChoice = (choice: string) => {
    if (choice === card.nativeLanguage) {
      speakCelebration(wrongCount);
      setWrongCount(0);
      onCorrect();
    } else {
      setWrongCount(prev => prev + 1);
      setVisibleChoices(prev => prev.filter(c => c !== choice));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <TouchableOpacity onPress={() => Speech.speak(card.learningLanguage, { language: 'ja' })}>
          <Text style={styles.mainText}>{card.learningLanguage}</Text>
        </TouchableOpacity>
        <Text style={styles.category}>{card.category}</Text>
      </View>

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