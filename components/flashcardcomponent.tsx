// ALark-Claude_Review@MEGADATA
// FlashCardComponent.tsx - Renders a flashcard with vanishing multiple choice options
// Supports both FlashCard (words) and LetterCard (hiragana/katakana/romaji)
// Wrong answers disappear on tap, correct answer advances to next card

import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { FlashCard, LetterCard } from '../lib/cards';
import { usePreferences } from '../lib/preferences';
import { useIsNarrow } from '../lib/responsive';
import { getLanguageConfig } from '../lib/languageConfig';

// Celebration phrases, particle pronunciation overrides, and TTS locale all
// now come from the card's own `language` field via getLanguageConfig()
// (see lib/languageConfig.ts) instead of being hardcoded Japanese
// constants here - a card already knows which language it belongs to, so
// this component doesn't need to assume Japanese itself, just look up
// whatever that card's language says. Behavior is unchanged today since
// only Japanese is registered.

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

// Gets the text that should actually be spoken aloud for a card's question.
// Differs from getQuestion() in two cases:
// - particle-category word cards, where the written kana and its spoken
//   reading diverge (は/へ overrides above).
// - letter cards whose question script is 'kanji': a bare kanji glyph is
//   genuinely ambiguous to TTS engines (most kanji have multiple possible
//   readings - on'yomi, kun'yomi, and often several of each), so asking
//   Speech.speak() to read "八" directly is a coin flip on whether it comes
//   out as "hachi" at all. The row's hiragana column is the one reading
//   this app actually teaches for that kanji (see letters_japanese's
//   one-reading-per-row limitation, noted in AGENTS.md), so that's what
//   gets spoken regardless of which script is currently shown as the
//   question - never the kanji character itself.
const getSpokenQuestion = (card: FlashCard | LetterCard): string => {
  if (card.cardType === 'letter' && card.questionScript === 'kanji') {
    return card.hiragana;
  }
  // 'romaji' is an English-letter transliteration, not real Japanese text -
  // speaking it with the Japanese TTS voice (language: 'ja', below) makes
  // the engine try to read raw Latin letters instead of the intended
  // pronunciation, producing garbled/wrong-sounding output. Fall back to
  // the kana reading instead (hiragana, else katakana for
  // katakana-only rows like loanwords) whenever the question script is
  // 'romaji' - this covers both plain kana rows and kanji rows, since a
  // kanji row can also land on a romaji-question mode (see LETTER_MODES in
  // offline.tsx; kanji-only compatibility is only enforced for the
  // 'kanji' script itself, not for 'romaji').
  if (card.cardType === 'letter' && card.questionScript === 'romaji') {
    return card.hiragana || card.katakana;
  }
  const text = getQuestion(card);
  if (card.cardType === 'flash' && (card as FlashCard).category === 'particle') {
    const overrides = getLanguageConfig(card.language).particlePronunciationOverrides;
    return overrides[text] ?? text;
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
  const isNarrow = useIsNarrow();
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
  // This card's language quirks (TTS locale, celebration phrases, particle
  // overrides) - see lib/languageConfig.ts. Looked up fresh per render off
  // card.language rather than assumed to be Japanese.
  const langConfig = getLanguageConfig(card.language);

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
    const phrases = langConfig.celebrationPhrases;
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    const penalty = count * 0.05;
    const pitch = Math.max(0.5, (0.9 + Math.random() * 0.1) - penalty);
    const rate = Math.max(0.5, (0.9 + Math.random() * 0.1) - penalty);
    Speech.speak(phrase, { language: langConfig.ttsLocale, pitch, rate });
  };

  // Speaks the actual reading instead of a celebration phrase - used when
  // announceMode is 'correct'. Same text as the tap-to-hear hint, but this
  // never touches heardHint - it fires after the answer's already locked in,
  // so it has no bearing on scoring either way.
  const announceCorrectReading = () => {
    if (muted) return;
    Speech.speak(getSpokenQuestion(card), { language: langConfig.ttsLocale });
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
      <View style={[
        isNarrow ? styles.cardNarrow : styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}>
        {/* Tap the question to hear it spoken. This does not check `muted` -
            that's intentional, tapping always plays the sound. It does mark
            heardHint so the eventual correct answer won't be scored. */}
        <TouchableOpacity onPress={() => {
          setHeardHint(true);
          Speech.speak(getSpokenQuestion(card), { language: langConfig.ttsLocale });
        }}>
          {/* imageUrl (a real photo) wins if set; emoji is the free
              fallback for rows with no photo uploaded yet. Most rows
              (letters, abstract/grammar words) have neither and render
              no picture at all, same layout as before this feature
              existed. */}
          {card.imageUrl ? (
            <Image
              source={{ uri: card.imageUrl }}
              style={isNarrow ? styles.cardImageNarrow : styles.cardImage}
              resizeMode="contain"
            />
          ) : card.emoji ? (
            <Text style={isNarrow ? styles.cardEmojiNarrow : styles.cardEmoji}>{card.emoji}</Text>
          ) : null}
          <Text style={[isNarrow ? styles.mainTextNarrow : styles.mainText, { color: colors.text }]}>{getQuestion(card)}</Text>
        </TouchableOpacity>
        {/* Category label (e.g. "verb", "particle") is only meaningful for
            word cards - letter cards use categories like "s-row" purely for
            internal filtering and shouldn't surface that as a hint. */}
        {card.cardType === 'flash' && (
          <Text style={[styles.category, { color: colors.textFaint }]}>{card.category}</Text>
        )}
      </View>

      <View style={isNarrow ? styles.choicesContainerNarrow : styles.choicesContainer}>
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
  // Smaller padding/minHeight so the card doesn't eat the whole viewport on
  // a phone-width screen - the desktop version's 32px padding + 200px min
  // height leaves very little room for the choice buttons below it once the
  // browser window is only ~360-430px tall in landscape or the keyboard is up.
  cardNarrow: {
    width: '100%',
    maxWidth: 400,
    minHeight: 140,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  cardImage: {
    width: 160,
    height: 160,
    marginBottom: 12,
    borderRadius: 8,
  },
  cardImageNarrow: {
    width: 100,
    height: 100,
    marginBottom: 8,
    borderRadius: 8,
  },
  cardEmoji: {
    fontSize: 96,
    marginBottom: 12,
    textAlign: 'center',
  },
  cardEmojiNarrow: {
    fontSize: 56,
    marginBottom: 8,
    textAlign: 'center',
  },
  mainText: {
    fontSize: 72,
    fontWeight: 'bold',
  },
  // 72px kanji/kana glyphs comfortably fill a desktop card but overflow or
  // crowd out a 375px-wide phone screen, especially for longer romaji
  // strings (e.g. multi-character verb readings) - shrunk and allowed to
  // wrap instead of forcing horizontal scroll.
  mainTextNarrow: {
    fontSize: 44,
    fontWeight: 'bold',
    textAlign: 'center',
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
  choicesContainerNarrow: {
    width: '100%',
    maxWidth: 400,
    gap: 10,
    marginBottom: 20,
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