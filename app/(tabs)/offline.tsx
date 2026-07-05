// ALark-Claude_Review@MEGADATA
// offline.tsx - Offline flashcard session screen with category selector
// Three column layout: categories | flashcard | empty
// Supports both word cards (FlashCard) and letter cards (LetterCard)

import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, TextInput, Switch } from 'react-native';
import { useFocusEffect } from 'expo-router';
import FlashCardComponent from '../../components/flashcardcomponent';
import { FlashCard, LetterCard } from '../../lib/cards';
import { fetchFlashCards, fetchLetterCards, fetchFilterOptions } from '../../lib/cardCashe';
import {
  initQueue,
  markCorrect,
  needsRefill,
  getActiveCards,
  addCards,
  clearQueue,
  getDecoys,
  shuffleCurrentToBack,
  hasRestedCards,
  recycleRestedCards,
} from '../../lib/cardQueue';
import { supabase } from '../../lib/supabase';
import { usePreferences } from '../../lib/preferences';
import { useIsNarrow } from '../../lib/responsive';
import {
  loadStudyWordCategories,
  saveStudyWordCategories,
  loadStudyLetterCategories,
  saveStudyLetterCategories,
  loadStudyModeIndexes,
  saveStudyModeIndexes,
  loadStudyMaxDifficulty,
  saveStudyMaxDifficulty,
  loadStudyTags,
  saveStudyTags,
} from '../../lib/studyPreferences';
import { WORD_CATEGORY_FALLBACK, LETTER_CATEGORIES } from '../../lib/categories';
import { recordAnswer } from '../../lib/progress';

const ALL_CATEGORIES = WORD_CATEGORY_FALLBACK;

const LETTER_MODES = [
  { question: 'hiragana', answer: 'romaji' },
  { question: 'katakana', answer: 'romaji' },
  { question: 'romaji', answer: 'hiragana' },
  { question: 'romaji', answer: 'katakana' },
  { question: 'hiragana', answer: 'katakana' },
  { question: 'katakana', answer: 'hiragana' },
  // Kanji-only modes - only satisfiable by rows with has_kanji (see
  // cardCashe.ts's per-row mode filtering). Kept separate from the plain
  // kana modes above so a kanji-only session can default straight to one
  // of these instead of the old kana-to-kana modes, which say nothing
  // about the actual kanji character.
  { question: 'kanji', answer: 'hiragana' },
  { question: 'kanji', answer: 'romaji' },
  { question: 'hiragana', answer: 'kanji' },
] as const;

const KANJI_DEFAULT_MODE = LETTER_MODES.find(m => m.question === 'kanji' && m.answer === 'hiragana')!;

export default function OfflineScreen() {
  const { colors, muted, setMuted, announceMode, setAnnounceMode } = usePreferences();
  const isNarrow = useIsNarrow();
  const [loading, setLoading] = useState(true);
  const [currentCard, setCurrentCard] = useState<FlashCard | LetterCard | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [sessionDone, setSessionDone] = useState(false);
  // True when the currently applied filters matched zero cards on the very
  // first fetch of a session (as opposed to sessionDone, which means the
  // user actually studied cards and then ran out). Kept separate from
  // sessionDone so the category/difficulty/tag panels stay visible and
  // usable - a full-screen "session complete" page with no way back to the
  // filters was a dead end when a filter combo (e.g. kanji + difficulty 1)
  // legitimately has no matching rows.
  const [noResults, setNoResults] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(ALL_CATEGORIES);
  const [categories, setCategories] = useState<string[]>(ALL_CATEGORIES);
  const [selectedLetterCategories, setSelectedLetterCategories] = useState<string[]>([]);
  const [selectedModes, setSelectedModes] = useState<typeof LETTER_MODES[number][]>([LETTER_MODES[0]]);
  // Right panel: difficulty cap + tag filter. difficultyCeiling is the
  // highest difficulty value actually present in the data (fetched live,
  // same reasoning as word categories) - it's the stepper's upper bound and
  // maxDifficulty's default when nothing's been persisted yet, so a fresh
  // install starts uncapped instead of arbitrarily capped at some guessed
  // scale. availableTags is the live union of every tag across both tables;
  // selectedTags empty means "disregard tags", non-empty means "row must
  // have ALL selected tags" (see cardCashe.ts's `.contains` filter).
  const [difficultyCeiling, setDifficultyCeiling] = useState<number>(1);
  const [maxDifficulty, setMaxDifficulty] = useState<number>(1);
  // availableTags is the live universe of real tag strings (fetched from
  // the data, not typed by hand) - used only to validate what the user
  // types, never rendered as buttons. Tags are freeform per-row descriptors
  // (e.g. "n5", "adjective", "loanword"), not a fixed category-like enum,
  // so the input is a text box + bubbles rather than a preset chip list.
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  // A handful of random real tags shown as tappable suggestions when
  // selectedTags is empty, so a user who's never seen the tag universe
  // still has an easy, guaranteed-valid starting point instead of guessing.
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  // Set when Apply/session-load finds a selected tag that doesn't match
  // anything in availableTags (typo or a tag that doesn't exist) - shown on
  // the card face instead of running a fetch that would just silently
  // return nothing.
  const [invalidTag, setInvalidTag] = useState<string | null>(null);
  // Flips true only after persisted filters have been restored into state
  // above, so the effect that kicks off loadSession() always sees the
  // restored values instead of a stale pre-restore closure.
  const [prefsRestored, setPrefsRestored] = useState(false);
  // Signed-in users get their answers written to user_progress; guests
  // (userId null, the default) just don't get progress tracked.
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  // --- Fetch available word categories from Supabase, restoring the
  // persisted selection (filtered against what's still actually available) ---
  //
  // storedCategories is null only when nothing has ever been saved (first
  // run) - that's the one case that should default to "everything." An
  // explicit empty selection ([], e.g. a kanji-only session that cleared
  // word categories on purpose) must be respected as-is, not treated the
  // same as "no preference" and silently reset back to all categories.
  const loadCategories = async (storedCategories: string[] | null) => {
    const { data } = await supabase
      .from('word_descriptions')
      .select('category');

    if (data) {
      const unique = [...new Set(data.map(d => d.category))] as string[];
      setCategories(unique);
      if (storedCategories === null) {
        setSelectedCategories(unique);
      } else {
        setSelectedCategories(storedCategories.filter(c => unique.includes(c)));
      }
    }
  };

  // --- Fetch the live difficulty ceiling + tag universe, restoring the
  // persisted maxDifficulty/tags selection (same null-vs-empty distinction
  // as loadCategories: null means never set, defaults to uncapped/no-filter). ---
  const loadFilterOptions = async (storedMaxDifficulty: number | null, storedTags: string[] | null) => {
    const { maxDifficulty: ceiling, tags: allTags } = await fetchFilterOptions();
    setDifficultyCeiling(ceiling);
    setAvailableTags(allTags);
    setMaxDifficulty(storedMaxDifficulty === null ? ceiling : Math.min(storedMaxDifficulty, ceiling));
    // Unlike categories, don't silently drop a persisted tag that no longer
    // matches availableTags - keep it as a bubble and let loadSession's
    // validation surface it as a proper "doesn't exist" error instead.
    setSelectedTags(storedTags ?? []);

    // A handful of random real tags to show as tappable suggestions when
    // nothing's typed yet - picked once per fetch (not re-randomized on
    // every render) so they don't jump around while the panel is open.
    const shuffled = [...allTags].sort(() => Math.random() - 0.5);
    setTagSuggestions(shuffled.slice(0, 5));
  };

  // --- Step the difficulty cap up/down by 1, clamped to [1, difficultyCeiling] ---
  const handleDifficultyChange = (delta: number) => {
    setMaxDifficulty(prev => {
      const next = Math.max(1, Math.min(difficultyCeiling, prev + delta));
      saveStudyMaxDifficulty(next);
      return next;
    });
  };

  // --- Shared core for adding a tag bubble, persisting the result.
  // Duplicate (case-insensitive) tags are ignored rather than added twice.
  // Validity isn't checked here - that happens on Apply, so a typo still
  // shows up as a bubble and only errors once applied. Used both by the
  // text input (handleAddTag) and by tapping a suggestion chip. ---
  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setSelectedTags(prev => {
      if (prev.some(t => t.toLowerCase() === trimmed.toLowerCase())) return prev;
      const next = [...prev, trimmed];
      saveStudyTags(next);
      return next;
    });
  };

  // --- Add whatever's currently typed in the tag input as a new bubble ---
  const handleAddTag = () => {
    addTag(tagInput);
    setTagInput('');
  };

  // --- Remove a tag bubble, persisting the result ---
  const handleRemoveTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = prev.filter(t => t !== tag);
      saveStudyTags(next);
      return next;
    });
  };

  // --- Toggle a word category on/off, persisting the result ---
  const handleCategoryToggle = (cat: string) => {
    setSelectedCategories(prev => {
      const next = prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat];
      saveStudyWordCategories(next);
      return next;
    });
  };

  // --- Toggle a letter category on/off, persisting the result ---
  //
  // Turning on 'kanji' is treated as switching into a dedicated kanji
  // session rather than adding kanji alongside whatever else was selected:
  // it clears word categories and any other letter categories, and swaps
  // in a kanji-testing mode. Without this, kanji rows would get mixed into
  // an otherwise-unrelated word/kana session by default, and the mode list
  // would still default to kana-only modes that never show the kanji
  // character at all - which is what produced an empty, crash-inducing
  // mode selection before (nothing in the old default modes felt relevant
  // to kanji, so it got manually deselected down to nothing).
  const handleLetterCategoryToggle = (cat: string) => {
    if (cat === 'kanji' && !selectedLetterCategories.includes('kanji')) {
      setSelectedLetterCategories(['kanji']);
      saveStudyLetterCategories(['kanji']);

      setSelectedCategories([]);
      saveStudyWordCategories([]);

      setSelectedModes([KANJI_DEFAULT_MODE]);
      saveStudyModeIndexes([LETTER_MODES.indexOf(KANJI_DEFAULT_MODE)]);
      return;
    }

    setSelectedLetterCategories(prev => {
      const next = prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat];
      saveStudyLetterCategories(next);
      return next;
    });
  };

  // --- Toggle a letter mode on/off, persisting by index (see studyPreferences.ts) ---
  const handleModeToggle = (mode: typeof LETTER_MODES[number]) => {
    setSelectedModes(prev => {
      const next = prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode];
      saveStudyModeIndexes(next.map(m => LETTER_MODES.indexOf(m)));
      return next;
    });
  };

  // --- Get correct answer text from any card type ---
  const getCorrectAnswer = (card: FlashCard | LetterCard): string => {
    if (card.cardType === 'letter') {
      return (card as any)[card.answerScript];
    }
    return (card as FlashCard).nativeLanguage;
  };

  // --- Fetches new cards using the currently applied word + letter categories ---
  // Shared by the initial load and every refill path so none of them can
  // silently drop a category the user actually applied.
  const fetchAppliedCards = async (count: number) => {
    const wordCards = selectedCategories.length > 0
      ? await fetchFlashCards(count, selectedCategories, maxDifficulty, selectedTags)
      : [];

    const letterCards = selectedLetterCategories.length > 0
      ? await fetchLetterCards(count, selectedModes, selectedLetterCategories, maxDifficulty, selectedTags)
      : [];

    return [...wordCards, ...letterCards].sort(() => Math.random() - 0.5);
  };

  // --- Load session - fetches word cards, letter cards, and decoy pools ---
  const loadSession = async () => {
    setLoading(true);
    setSessionDone(false);

    // Catch a typo'd/nonexistent tag before ever hitting the network - a
    // `.contains('tags', [...])` filter with a tag nobody has would just
    // silently come back empty, indistinguishable from a legitimately empty
    // filter combo. Naming the actual bad tag is more useful than "None available".
    const invalid = selectedTags.find(
      t => !availableTags.some(at => at.toLowerCase() === t.toLowerCase())
    );
    if (invalid) {
      clearQueue();
      setCurrentCard(null);
      setChoices([]);
      setNoResults(false);
      setInvalidTag(invalid);
      setLoading(false);
      return;
    }
    setInvalidTag(null);

    const allCards = await fetchAppliedCards(20);

    // Nothing matches the applied filters at all - show the inline "None
    // available" state instead of initializing a queue (which would just
    // immediately bounce into the sessionDone dead-end - see noResults'
    // declaration comment above).
    if (allCards.length === 0) {
      clearQueue();
      setCurrentCard(null);
      setChoices([]);
      setNoResults(true);
      setLoading(false);
      return;
    }
    setNoResults(false);

    // Fetch word decoys, tagged with each row's id so getDecoys() can
    // exclude a decoy that happens to come from the same row as the
    // current card.
    const decoyCards = selectedCategories.length > 0
      ? await fetchFlashCards(20, selectedCategories, maxDifficulty, selectedTags)
      : [];
    const decoyWords = decoyCards.map(c => ({ id: c.id, text: c.nativeLanguage }));

    // Fetch letter decoys if letters selected - same id tagging, which
    // matters more here since one row has 3 valid-looking readings
    // (hiragana/katakana/romaji) depending on which mode was rolled.
    const letterDecoyPool = selectedLetterCategories.length > 0
      ? (await fetchLetterCards(30, selectedModes, selectedLetterCategories, maxDifficulty, selectedTags))
          .map(c => ({ id: c.id, text: (c as any)[c.answerScript] as string }))
      : [];

    initQueue(allCards, decoyWords, letterDecoyPool);
    showNextCard();
    setLoading(false);
  };

  // --- Pick the next card from the front of the queue ---
  const showNextCard = () => {
    const queue = getActiveCards();

    if (queue.length === 0) {
      fetchAppliedCards(10).then(newCards => {
        addCards(newCards);

        // Nothing fresh came back (either the fetch was empty, or every
        // row it returned is already mastered/resting this session). If
        // there's anything resting, bring it back into rotation instead of
        // stopping - a small filter combo (e.g. one kanji difficulty tier)
        // will otherwise "master" its entire pool and then have nothing
        // left to show, even though the user hasn't left the session.
        if (getActiveCards().length === 0 && hasRestedCards()) {
          recycleRestedCards();
        }

        // Truly nothing left anywhere - not fresh, not resting - means the
        // applied filters have no more matching content at all.
        if (getActiveCards().length === 0) {
          setSessionDone(true);
          return;
        }

        showNextCard();
      });
      return;
    }

    const next = queue[0].card;
    setCurrentCard(next);

    // Get correct answer based on card type
    const correctAnswer = getCorrectAnswer(next);

    // Build choices - 1 correct + 3 decoys shuffled
    const decoys = getDecoys(correctAnswer, next.cardType, next.id);
    const allChoices = [correctAnswer, ...decoys];
    const shuffled = allChoices.sort(() => Math.random() - 0.5);
    setChoices(shuffled);
  };

  // --- Called when user taps the correct answer ---
  // usedHint is true if the question was tapped to hear it spoken this card -
  // in that case the card still advances normally, but the answer is not
  // written to user_progress at all (neither helps nor hurts accuracy),
  // since hearing the reading spoken makes "getting it right" meaningless
  // as a signal. This is independent of mute state by design.
  const handleCorrect = (wasFirstTry: boolean, usedHint: boolean) => {
    if (!currentCard) return;
    markCorrect(currentCard.id);
    if (userId && !usedHint) {
      recordAnswer(userId, currentCard.id, wasFirstTry);
    }
    shuffleCurrentToBack();
    if (needsRefill()) {
      fetchAppliedCards(10).then(newCards => {
        addCards(newCards);
      });
    }
    showNextCard();
  };

  // --- On focus: restore persisted filters, then (via the effect below)
  // kick off the session once those restored values have actually
  // committed to state. Clear session state when the user leaves the tab. ---
  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        const [
          storedWordCategories,
          storedLetterCategories,
          storedModeIndexes,
          storedMaxDifficulty,
          storedTags,
        ] = await Promise.all([
          loadStudyWordCategories(),
          loadStudyLetterCategories(),
          loadStudyModeIndexes(),
          loadStudyMaxDifficulty(),
          loadStudyTags(),
        ]);
        if (!active) return;

        if (storedLetterCategories) {
          setSelectedLetterCategories(storedLetterCategories);
        }
        if (storedModeIndexes && storedModeIndexes.length > 0) {
          const restoredModes = storedModeIndexes
            .map(i => LETTER_MODES[i])
            .filter((m): m is typeof LETTER_MODES[number] => !!m);
          if (restoredModes.length > 0) setSelectedModes(restoredModes);
        }

        await Promise.all([
          loadCategories(storedWordCategories),
          loadFilterOptions(storedMaxDifficulty, storedTags),
        ]);
        setPrefsRestored(true);
      })();

      return () => {
        active = false;
        clearQueue();
        setPrefsRestored(false);
      };
    }, [])
  );

  // Fires once prefsRestored flips true, i.e. on the render after every
  // restored filter has actually committed - so loadSession() (and the
  // showNextCard/fetchAppliedCards closures it calls) read the restored
  // values instead of racing ahead of the setState calls above.
  useEffect(() => {
    if (prefsRestored) {
      loadSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsRestored]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.text} size="large" />
        <Text style={[styles.loadingText, { color: colors.textFaint }]}>Loading cards...</Text>
      </View>
    );
  }

  if (sessionDone) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.doneText, { color: colors.text }]}>セッション完了</Text>
        <Text style={[styles.doneSubText, { color: colors.textMuted }]}>Session complete!</Text>
        <TouchableOpacity style={[styles.restartButton, { backgroundColor: colors.accent }]} onPress={loadSession}>
          <Text style={[styles.restartText, { color: colors.accentText }]}>Start Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // currentCard is legitimately null whenever noResults or invalidTag is
  // shown instead of a real card - only bail out to a blank screen if none
  // of the three states account for the missing card (e.g. still between
  // renders).
  if (!currentCard && !noResults && !invalidTag) return null;

  // --- Categories panel content (word categories + letters + modes) -
  // shared between the wide 3-column layout and the narrow stacked one. ---
  const categoriesPanel = (
    <>
      <Text style={[styles.panelTitle, { color: colors.textFaint }]}>Categories</Text>
      <ScrollView style={isNarrow ? styles.categoryListNarrow : styles.categoryList}>

        {/* Word categories */}
        {categories.map(cat => {
          const active = selectedCategories.includes(cat);
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
                active && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
              onPress={() => handleCategoryToggle(cat)}
            >
              <Text style={[
                styles.categoryText,
                { color: colors.textFaint },
                active && { color: colors.accentText, fontWeight: 'bold' },
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Letters section */}
        <Text style={[styles.panelTitle, { color: colors.textFaint, marginTop: 16 }]}>Letters</Text>
        {LETTER_CATEGORIES.map(cat => {
          const active = selectedLetterCategories.includes(cat);
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
                active && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
              onPress={() => handleLetterCategoryToggle(cat)}
            >
              <Text style={[
                styles.categoryText,
                { color: colors.textFaint },
                active && { color: colors.accentText, fontWeight: 'bold' },
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Mode selection - only show if letters selected */}
        {selectedLetterCategories.length > 0 && (
          <>
            <Text style={[styles.panelTitle, { color: colors.textFaint, marginTop: 16 }]}>Mode</Text>
            {LETTER_MODES.map((mode, index) => {
              const active = selectedModes.includes(mode);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    active && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  onPress={() => handleModeToggle(mode)}
                >
                  <Text style={[
                    styles.categoryText,
                    { color: colors.textFaint },
                    active && { color: colors.accentText, fontWeight: 'bold' },
                  ]}>
                    {mode.question} → {mode.answer}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

      </ScrollView>

      <TouchableOpacity style={[styles.applyButton, { backgroundColor: colors.accent }]} onPress={loadSession}>
        <Text style={[styles.applyText, { color: colors.accentText }]}>Apply</Text>
      </TouchableOpacity>
    </>
  );

  // --- The flashcard box itself, header (announce toggle + mute) plus
  // whichever state applies (tag error / no results / an actual card). On
  // narrow screens the header wraps and its labels shorten, since
  // "Announce correct" + a switch + "Announce Celebration" + a mute button
  // all on one line doesn't fit a phone-width screen. ---
  const cardBoxContent = (
    <View style={[
      isNarrow ? styles.cardBoxNarrow : styles.cardBox,
      { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
    ]}>
      <View style={styles.cardBoxHeader}>
        <View style={styles.announceToggleRow}>
          <Text style={[styles.announceLabel, { color: announceMode === 'correct' ? colors.text : colors.textFaint }]}>
            {isNarrow ? 'Correct' : 'Announce correct'}
          </Text>
          <Switch
            value={announceMode === 'celebration'}
            onValueChange={(value) => setAnnounceMode(value ? 'celebration' : 'correct')}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.surface}
          />
          <Text style={[styles.announceLabel, { color: announceMode === 'celebration' ? colors.text : colors.textFaint }]}>
            {isNarrow ? 'Celebrate' : 'Announce Celebration'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.muteButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setMuted(!muted)}
        >
          <Text style={styles.muteText}>{muted ? '🔇' : '🔊'}</Text>
        </TouchableOpacity>
      </View>
      {invalidTag ? (
        <View style={styles.noResultsBox}>
          <Text style={[styles.noResultsText, { color: colors.danger }]}>Tag error</Text>
          <Text style={[styles.noResultsHint, { color: colors.textFaint }]}>
            Tag: "{invalidTag}" doesn't exist
          </Text>
        </View>
      ) : noResults || !currentCard ? (
        <View style={styles.noResultsBox}>
          <Text style={[styles.noResultsText, { color: colors.text }]}>None available</Text>
          <Text style={[styles.noResultsHint, { color: colors.textFaint }]}>
            No cards match the current filters - try widening categories, difficulty, or tags.
          </Text>
        </View>
      ) : (
        <FlashCardComponent
          card={currentCard}
          choices={choices}
          onCorrect={handleCorrect}
          muted={muted}
          announceMode={announceMode}
        />
      )}
    </View>
  );

  // --- Difficulty stepper + tag filter panel content - shared between
  // layouts, same as categoriesPanel above. ---
  const filtersPanel = (
    <>
      <Text style={[styles.panelTitle, { color: colors.textFaint }]}>Difficulty</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={[styles.stepperButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => handleDifficultyChange(-1)}
          disabled={maxDifficulty <= 1}
        >
          <Text style={[styles.stepperButtonText, { color: colors.text }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.stepperValue, { color: colors.text }]}>{maxDifficulty}</Text>
        <TouchableOpacity
          style={[styles.stepperButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => handleDifficultyChange(1)}
          disabled={maxDifficulty >= difficultyCeiling}
        >
          <Text style={[styles.stepperButtonText, { color: colors.text }]}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.stepperHint, { color: colors.textFaint }]}>max out of {difficultyCeiling}</Text>

      <Text style={[styles.panelTitle, { color: colors.textFaint, marginTop: 16 }]}>Tags</Text>
      <View style={styles.tagInputRow}>
        <TextInput
          style={[styles.tagInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="add a tag..."
          placeholderTextColor={colors.textFaint}
          value={tagInput}
          onChangeText={setTagInput}
          onSubmitEditing={handleAddTag}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.tagAddButton, { backgroundColor: colors.accent }]}
          onPress={handleAddTag}
        >
          <Text style={[styles.tagAddButtonText, { color: colors.accentText }]}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={isNarrow ? styles.categoryListNarrow : styles.categoryList}>
        {selectedTags.length === 0 && tagSuggestions.length > 0 && (
          <>
            <Text style={[styles.suggestionsLabel, { color: colors.textFaint }]}>Suggestions</Text>
            <View style={styles.tagBubbleWrap}>
              {tagSuggestions.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => addTag(tag)}
                >
                  <Text style={[styles.tagBubbleText, { color: colors.textFaint }]}>{tag} +</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        <View style={styles.tagBubbleWrap}>
          {selectedTags.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tagBubble, { backgroundColor: colors.accent, borderColor: colors.accent }]}
              onPress={() => handleRemoveTag(tag)}
            >
              <Text style={[styles.tagBubbleText, { color: colors.accentText }]}>{tag} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={[styles.applyButton, { backgroundColor: colors.accent }]} onPress={loadSession}>
        <Text style={[styles.applyText, { color: colors.accentText }]}>Apply</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.progress, { color: colors.textFaint }]}>
        {getActiveCards().length} cards remaining
      </Text>

      {isNarrow ? (
        // Narrow/phone layout: card first (the actual point of the screen),
        // then categories, then difficulty/tags, all stacked full-width and
        // scrolling together - a fixed 3-column layout with 200px side
        // panels just doesn't fit a ~360-430px phone viewport.
        <ScrollView contentContainerStyle={styles.narrowContent}>
          <View style={styles.centerPanelNarrow}>
            {cardBoxContent}
          </View>
          <View style={[styles.panelNarrow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            {categoriesPanel}
          </View>
          <View style={[styles.panelNarrow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            {filtersPanel}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.columns}>
          <View style={[styles.leftPanel, { backgroundColor: colors.surfaceAlt, borderRightColor: colors.border }]}>
            {categoriesPanel}
          </View>
          <View style={styles.centerPanel}>
            {cardBoxContent}
          </View>
          <View style={[styles.rightPanel, { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.border }]}>
            {filtersPanel}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  center: {
    flex: 1,
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
    borderRightWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  categoryList: {
    flex: 1,
    gap: 8,
  },
  // Narrow/stacked layout: the parent is a ScrollView (unbounded height),
  // so flex:1 has nothing to fill against - cap the height instead and let
  // this list scroll on its own within that box.
  categoryListNarrow: {
    maxHeight: 260,
    gap: 8,
  },
  centerPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerPanelNarrow: {
    width: '100%',
    alignItems: 'center',
    padding: 16,
  },
  cardBox: {
    width: '100%',
    maxWidth: 540,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flex: 1,
    maxHeight: 720,
  },
  // Narrow layout equivalent of cardBox - independent (not merged with
  // cardBox) since flex:1/maxHeight assume a bounded flex-row parent that
  // doesn't exist once this is stacked inside a ScrollView.
  cardBoxNarrow: {
    width: '100%',
    maxWidth: 540,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 480,
  },
  narrowContent: {
    paddingTop: 8,
    paddingBottom: 32,
    gap: 16,
  },
  panelNarrow: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  announceToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  announceLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  muteButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  muteText: {
    fontSize: 16,
  },
  noResultsBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  noResultsText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  noResultsHint: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 320,
  },
  rightPanel: {
    width: 200,
    borderLeftWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: 'bold',
    minWidth: 24,
    textAlign: 'center',
  },
  stepperHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  tagAddButton: {
    width: 34,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagAddButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  suggestionsLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  tagBubbleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBubble: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  tagBubbleText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  panelTitle: {
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
  },
  categoryText: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  applyButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  applyText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  doneText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  doneSubText: {
    fontSize: 18,
  },
  restartButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  restartText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  progress: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
});
