// ALark-Claude_Review@MEGADATA
// FlashCardComponent.tsx - Renders a flashcard with vanishing multiple choice options
// Supports both FlashCard (words) and LetterCard (hiragana/katakana/romaji)
// Wrong answers disappear on tap, correct answer advances to next card

import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { FlashCard, LetterCard } from '../lib/cards';
import { usePreferences } from '../lib/preferences';

const CELEBRATION_PHRASES = [
  'すごい！', 'すごいね！', 'やるじゃん！', 'さすが！', 'かっこいい！',
  'やばい！', 'マジで！', 'うわあ！', 'いいね！', 'よくできました！',
  'その通り！', '正解！', '合ってる！', 'バッチリ！', '完璧！',
  'よし！', 'パーフェクト！', 'ナイス！', 'ブラボー！', '天才！',
  '神！', 'やるね！', 'さすがだね！', 'もちろん！', 'えらい！',
  'よかった！', '上手！', '頑張ったね！', '素晴らしい！', '最高！',
];

interface Props {
  card: FlashCard | LetterCard;
  choices: string[];
  // wasFirstTry is true only if the correct answer was tapped before any
  // wrong guess on this card - callers use this to weight accuracy.
  // usedHint is true if the question was tapped to hear it spoken this
  // card - callers should skip recording progress entirely when true,
  // since hearing the answer read aloud makes "getting it right" meaningless
  // as a signal. This checks whether the hint was tapped, not whether audio
  // was actually muted - tapping counts as using the hint either way.
  onCorrect: (wasFirstTry: boolean, usedHint: boolean) => void;
  muted: boolean;
  // 'celebration' (default): a random Japanese exclamation plays on a
  // correct answer, as before. 'correct': the actual reading is spoken
  // instead (same audio as tapping the question), so you hear the real
  // pronunciation every time without needing the tap-to-hear hint. Either
  // way this is unrelated to heardHint/scoring - it always counts normally.
  announceMode: 'correct' | 'celebration';
}

// Gets the question text based on card type
const getQuestion = (card: FlashCard | LetterCard): string => {
  if (card.cardType === 'letter') {
    return card[card.questionScript as keyof LetterCard] as string;
  }
  return (card as FlashCard).learningLanguage;
};

// Some hiragana are pronounced differently when they're doing grammatical
// work as a particle than when they're just their base kana reading.
// は as the topic marker is spoken "wa", not its base reading "ha".
// へ as the direction particle is spoken "e", not its base reading "he".
// This must only apply to word/particle flashcards - letter-mode cards
// (cardType 'letter') are specifically teaching the base kana reading and
// should still say "ha"/"he" respectively.
const PARTICLE_PRONUNCIATION_OVERRIDES: Record<string, string> = {
  'は': 'わ', // topic marker, spoken "wa"
  'へ': 'え', // direction marker, spoken "e"
};

// Gets the text that should actually be spoken aloud for a card's question.
// Differs from getQuestion() only for particle-category word cards, where
// the written kana and its spoken reading diverge.
const getSpokenQuestion = (card: FlashCard | LetterCard): string => {
  const text = getQuestion(card);
  if (card.cardType === 'flash' && (card as FlashCard).category === 'particle') {
    return PARTICLE_PRONUNCIATION_OVERRIDES[text] ?? text;
  }
  return text;
};

// Gets the correct answer text based on card type
const getAnswer = (card: FlashCard | LetterCard): string => {
  if (card.cardType === 'letter') {
    return card[card.answerScript as keyof LetterCard] as string;
  }
  return (card as FlashCard).nativeLanguage;
};

export default function FlashCardComponent({ card, choices, onCorrect, muted, announceMode }: Props) {
  const { colors, customCelebrationEnabled, customCelebrationSoundUri } = usePreferences();
  const [visibleChoices, setVisibleChoices] = useState<string[]>(choices);
  const [wrongCount, setWrongCount] = useState(0);
  // Tracks whether the question was tapped to hear it spoken this card.
  // Resets per card - using the hint on a previous card must not bleed
  // into the next one.
  const [heardHint, setHeardHint] = useState(false);
  // Holds the currently-loaded custom celebration sound so repeated correct
  // answers don't leak Sound instances - each play unloads the previous one
  // before loading the next.
  const customSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    setVisibleChoices(choices);
    setWrongCount(0);
    setHeardHint(false);
  }, [card.id, choices]);

  useEffect(() => {
    return () => {
      customSoundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  // wrongCount penalty lowers pitch/rate the more wrong answers were given
  const speakCelebration = (count: number) => {
    if (muted) return;
    const phrase = CELEBRATION_PHRASES[Math.floor(Math.random() * CELEBRATION_PHRASES.length)];
    const penalty = count * 0.05;
    const pitch = Math.max(0.5, (0.9 + Math.random() * 0.1) - penalty);
    const rate = Math.max(0.5, (0.9 + Math.random() * 0.1) - penalty);
    Speech.speak(phrase, { language: 'ja', pitch, rate });
  };

  // Speaks the actual reading instead of a celebration phrase - used when
  // announceMode is 'correct'. Same text as the tap-to-hear hint, but this
  // never touches heardHint - it fires after the answer's already locked in,
  // so it has no bearing on scoring either way.
  const announceCorrectReading = () => {
    if (muted) return;
    Speech.speak(getSpokenQuestion(card), { language: 'ja' });
  };

  // Plays the user's chosen celebration sound file instead of a TTS phrase.
  // Only called when customCelebrationEnabled and a sound has actually been
  // picked in Settings - callers fall back to speakCelebration otherwise.
  const playCustomCelebrationSound = async () => {
    if (muted || !customCelebrationSoundUri) return;
    try {
      if (customSoundRef.current) {
        await customSoundRef.current.unloadAsync();
        customSoundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: customCelebrationSoundUri });
      customSoundRef.current = sound;
      await sound.playAsync();
    } catch (err) {
      console.warn('flashcard: could not play custom celebration sound', err);
    }
  };

  const handleChoice = (choice: string) => {
    if (choice === getAnswer(card)) {
      if (announceMode === 'correct') {
        announceCorrectReading();
      } else if (customCelebrationEnabled && customCelebrationSoundUri) {
        playCustomCelebrationSound();
      } else {
        speakCelebration(wrongCount);
      }
      const wasFirstTry = wrongCount === 0;
      setWrongCount(0);
      onCorrect(wasFirstTry, heardHint);
    } else {
      setWrongCount(prev => prev + 1);
      setVisibleChoices(prev => prev.filter(c => c !== choice));
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Tap the question to hear it spoken. This does not check `muted` -
            that's intentional, tapping always plays the sound. It does mark
            heardHint so the eventual correct answer won't be scored. */}
        <TouchableOpacity onPress={() => {
          setHeardHint(true);
          Speech.speak(getSpokenQuestion(card), { language: 'ja' });
        }}>
          <Text style={[styles.mainText, { color: colors.text }]}>{getQuestion(card)}</Text>
        </TouchableOpacity>
        {/* Category label (e.g. "verb", "particle") is only meaningful for
            word cards - letter cards use categories like "s-row" purely for
            internal filtering and shouldn't surface that as a hint. */}
        {card.cardType === 'flash' && (
          <Text style={[styles.category, { color: colors.textFaint }]}>{card.category}</Text>
        )}
      </View>

      <View style={styles.choicesContainer}>
        {visibleChoices.map((choice, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.choiceButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleChoice(choice)}
          >
            <Text style={[styles.choiceText, { color: colors.text }]}>{choice}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    minHeight: 200,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderWidth: 1,
    marginBottom: 32,
  },
  mainText: {
    fontSize: 72,
    fontWeight: 'bold',
  },
  category: {
    fontSize: 12,
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
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  choiceText: {
    fontSize: 16,
  },
});