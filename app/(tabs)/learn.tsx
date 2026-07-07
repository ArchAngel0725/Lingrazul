// ALark-Claude_Review@MEGADATA
// learn.tsx - "Basics" tab. Left nav (same responsive pattern as
// community.tsx) splits lessons into two categories - see lib/lessons.ts's
// LessonType:
//   - 'fundamentals': the original curated reading lessons (hiragana-basics,
//     katakana-basics), read as one long scrolling page (FundamentalsDetail).
//   - 'practical': real-world scenario lessons (ordering food, asking
//     directions, etc. - not yet authored, see
//     supabase/sql/v2_add_lesson_type.sql), read one lesson_section at a
//     time via Next/Back (PracticalLessonView) instead of one long page -
//     "click-through" per the feature request, no separate schema needed
//     for that behavior since a Practical Lesson's "steps" are just its
//     ordinary lesson_sections rows, paged client-side.
// Both categories share the same lessons/lesson_sections tables and the
// same list-then-detail flow - only the detail rendering differs.
//
// Content comes from lib/lessons.ts (lessons/lesson_sections tables, see
// supabase/sql/v2_lessons_schema.sql) - hand-authored official content, not
// user-submitted ("community lessons" is a separate, deferred idea - see
// AGENTS.md).

import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { usePreferences, ExerciseInputMode } from '../../lib/preferences';
import { useIsNarrow } from '../../lib/responsive';
import { useActiveLanguage } from '../../lib/activeLanguage';
import { fetchLessons, fetchLessonDetail, LessonSummary, LessonSection, LessonType, LessonBlank } from '../../lib/lessons';
import { isCorrectBlankAnswer, displayAnswer, buildWordBank } from '../../lib/lessonBlanks';

type ViewState =
  | { mode: 'list' }
  | { mode: 'detail'; lesson: LessonSummary; sections: LessonSection[] | null };

const NAV_ITEMS: { key: LessonType; label: string }[] = [
  { key: 'fundamentals', label: 'Fundamentals' },
  { key: 'practical', label: 'Practical Lessons' },
];

const EMPTY_COPY: Record<LessonType, { title: string; body: string }> = {
  fundamentals: {
    title: 'No lessons yet',
    body: 'Lessons are on their way - check back soon.',
  },
  practical: {
    title: 'No practical lessons yet',
    body: 'Real-world scenario lessons (ordering food, asking directions, and more) are on their way.',
  },
};

export default function LearnScreen() {
  const { colors, exerciseInputMode } = usePreferences();
  const isNarrow = useIsNarrow();
  const { languageCode } = useActiveLanguage();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [section, setSection] = useState<LessonType>('fundamentals');
  const [view, setView] = useState<ViewState>({ mode: 'list' });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setView({ mode: 'list' });

      (async () => {
        setLoading(true);
        const data = await fetchLessons(languageCode);
        if (active) {
          setLessons(data);
          setLoading(false);
        }
      })();

      return () => { active = false; };
    }, [languageCode])
  );

  // Switching category while a lesson is open closes it rather than trying
  // to keep an unrelated detail view around - the nav stays visible either
  // way so this is a single tap to get back to browsing.
  const handleSectionChange = (key: LessonType) => {
    setSection(key);
    setView({ mode: 'list' });
  };

  const openLesson = async (lesson: LessonSummary) => {
    setView({ mode: 'detail', lesson, sections: null });
    const sections = await fetchLessonDetail(lesson.id);
    setView({ mode: 'detail', lesson, sections });
  };

  const backToList = () => setView({ mode: 'list' });

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.text} size="large" />
      </View>
    );
  }

  return (
    <View style={[isNarrow ? styles.containerNarrow : styles.container, { backgroundColor: colors.background }]}>
      {/* Left nav - same collapse-to-horizontal-bar pattern as
          community.tsx's left nav, for the same reason: no room for a
          200px side column at phone width. */}
      <View style={[
        isNarrow ? styles.leftPanelNarrow : styles.leftPanel,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
      ]}>
        {!isNarrow && <Text style={[styles.panelTitle, { color: colors.textFaint }]}>Basics</Text>}
        <View style={isNarrow ? styles.navRowNarrow : undefined}>
          {NAV_ITEMS.map(item => {
            const active = section === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  isNarrow ? styles.navItemNarrow : styles.navItem,
                  { borderColor: colors.border },
                  active && { backgroundColor: colors.accent, borderColor: colors.accent },
                ]}
                onPress={() => handleSectionChange(item.key)}
              >
                <Text style={[
                  styles.navText,
                  { color: colors.textMuted },
                  active && { color: colors.accentText, fontWeight: 'bold' },
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main panel */}
      <View style={styles.mainPanel}>
        {view.mode === 'detail' ? (
          view.lesson.lessonType === 'practical' ? (
            <PracticalLessonView
              key={view.lesson.id}
              colors={colors}
              lesson={view.lesson}
              sections={view.sections}
              onExit={backToList}
              exerciseInputMode={exerciseInputMode}
            />
          ) : (
            <FundamentalsDetail colors={colors} lesson={view.lesson} sections={view.sections} onBack={backToList} />
          )
        ) : (
          <LessonListView
            colors={colors}
            section={section}
            lessons={lessons.filter(l => l.lessonType === section)}
            onOpen={openLesson}
          />
        )}
      </View>
    </View>
  );
}

// --- List view for whichever category is selected in the left nav ---
function LessonListView({
  colors, section, lessons, onOpen,
}: {
  colors: any; section: LessonType; lessons: LessonSummary[]; onOpen: (lesson: LessonSummary) => void;
}) {
  const empty = EMPTY_COPY[section];
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>
        {section === 'practical' ? 'Practical Lessons' : 'Fundamentals'}
      </Text>

      {lessons.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{empty.title}</Text>
          <Text style={[styles.emptyBody, { color: colors.textMuted }]}>{empty.body}</Text>
        </View>
      ) : (
        lessons.map(lesson => (
          <TouchableOpacity
            key={lesson.id}
            style={[styles.lessonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => onOpen(lesson)}
          >
            <Text style={[styles.lessonTitle, { color: colors.text }]}>{lesson.title}</Text>
            {lesson.subtitle && (
              <Text style={[styles.lessonSubtitle, { color: colors.textFaint }]}>{lesson.subtitle}</Text>
            )}
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

// --- Original Fundamentals reading experience - every section on one
// scrolling page, unchanged from before Practical Lessons existed. ---
function FundamentalsDetail({
  colors, lesson, sections, onBack,
}: {
  colors: any; lesson: LessonSummary; sections: LessonSection[] | null; onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Text style={[styles.backText, { color: colors.textMuted }]}>{'‹ Fundamentals'}</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.text }]}>{lesson.title}</Text>

      {sections === null ? (
        <ActivityIndicator color={colors.text} style={{ marginTop: 24 }} />
      ) : (
        sections.map(section => (
          <View key={section.id} style={styles.section}>
            {section.heading && (
              <Text style={[styles.sectionHeading, { color: colors.text }]}>{section.heading}</Text>
            )}
            {section.body.split(/\n\n+/).map((paragraph, i) => (
              <Text key={i} style={[styles.paragraph, { color: colors.textMuted }]}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

// --- Practical Lessons' click-through reading experience: one
// lesson_section at a time, Next/Back, no long scroll. Keyed by lesson.id
// at the call site so switching lessons always remounts this with a fresh
// stepIndex instead of carrying over the previous lesson's position. ---
function PracticalLessonView({
  colors, lesson, sections, onExit, exerciseInputMode,
}: {
  colors: any; lesson: LessonSummary; sections: LessonSection[] | null; onExit: () => void;
  exerciseInputMode: ExerciseInputMode;
}) {
  const [stepIndex, setStepIndex] = useState(0);

  if (sections === null) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={onExit} style={styles.backRow}>
          <Text style={[styles.backText, { color: colors.textMuted }]}>{'‹ Practical Lessons'}</Text>
        </TouchableOpacity>
        <ActivityIndicator color={colors.text} style={{ marginTop: 24 }} />
      </ScrollView>
    );
  }

  if (sections.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={onExit} style={styles.backRow}>
          <Text style={[styles.backText, { color: colors.textMuted }]}>{'‹ Practical Lessons'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{lesson.title}</Text>
        <Text style={[styles.emptyBody, { color: colors.textMuted }]}>This lesson has no steps yet.</Text>
      </ScrollView>
    );
  }

  const step = sections[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === sections.length - 1;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onExit} style={styles.backRow}>
        <Text style={[styles.backText, { color: colors.textMuted }]}>{'‹ Practical Lessons'}</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.text }]}>{lesson.title}</Text>
      <Text style={[styles.stepIndicator, { color: colors.textFaint }]}>
        Step {stepIndex + 1} of {sections.length}
      </Text>

      {/* Reading-only step card - the fill-in-the-blank practice that used
          to live inline here has moved into the always-visible Test panel
          below (see LessonTestPanel), so the lesson stays available to
          re-read while testing ("open book") instead of the practice
          question disappearing once you page past its step. */}
      <View style={[styles.stepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {step.heading && (
          <Text style={[styles.sectionHeading, { color: colors.text }]}>{step.heading}</Text>
        )}
        {step.body.split(/\n\n+/).map((paragraph, i) => (
          <Text key={i} style={[styles.paragraph, { color: colors.textMuted }]}>
            {paragraph}
          </Text>
        ))}

        {/* Page-turn arrows anchored to the card's own bottom corners
            instead of a separate full-width button row below it. The last
            step's forward arrow disables rather than exiting the lesson -
            there's no "Finish" action anymore since the lesson no longer
            closes on its own; leaving is only ever the "‹ Practical
            Lessons" link above, and the Test panel is just scrolled down
            to whenever you're ready for it. */}
        <View style={styles.pageTurnRow}>
          <TouchableOpacity
            disabled={isFirst}
            onPress={() => setStepIndex(i => i - 1)}
            style={[
              styles.pageTurnButton,
              { borderColor: colors.border },
              isFirst && styles.pageTurnButtonDisabled,
            ]}
          >
            <Text style={[styles.pageTurnArrow, { color: isFirst ? colors.textFaint : colors.text }]}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={isLast}
            onPress={() => setStepIndex(i => i + 1)}
            style={[
              styles.pageTurnButton,
              { borderColor: colors.border },
              isLast && styles.pageTurnButtonDisabled,
            ]}
          >
            <Text style={[styles.pageTurnArrow, { color: isLast ? colors.textFaint : colors.text }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <LessonTestPanel colors={colors} sections={sections} exerciseInputMode={exerciseInputMode} />
    </ScrollView>
  );
}

// --- The "open book" Test panel: every step's fill-in-the-blank question
// (if it has one), gathered into one always-visible panel below the step
// card - not gated behind reaching the last step, since the whole point is
// that the lesson content stays scrollable-to while testing. Steps with no
// blank (the intro/review steps) simply contribute nothing here. Renders
// nothing at all if the lesson has no blanks yet. ---
function LessonTestPanel({
  colors, sections, exerciseInputMode,
}: {
  colors: any; sections: LessonSection[]; exerciseInputMode: ExerciseInputMode;
}) {
  const questions = sections.filter((s): s is LessonSection & { blank: LessonBlank } => s.blank !== null);
  if (questions.length === 0) return null;

  return (
    <View style={[styles.testPanel, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Text style={[styles.testPanelTitle, { color: colors.text }]}>Test</Text>
      <Text style={[styles.testPanelHint, { color: colors.textFaint }]}>
        Fill in each blank - scroll up any time to check the lesson above.
      </Text>
      {questions.map((q, i) => (
        <View key={q.id} style={styles.testQuestion}>
          <Text style={[styles.testQuestionNumber, { color: colors.textFaint }]}>
            {i + 1}. {q.heading}
          </Text>
          <BlankExercise colors={colors} blank={q.blank} inputMode={exerciseInputMode} />
        </View>
      ))}
    </View>
  );
}

// --- A single fill-in-the-blank check within a Practical Lesson's Test
// panel (see LessonTestPanel above, lib/lessons.ts's LessonBlank, and
// lib/lessonBlanks.ts's grading helpers). Two interaction modes per the
// Settings toggle (lib/preferences.tsx's ExerciseInputMode):
// - 'tap': wordBank is built once per mount (useState initializer, not
//   recomputed every render, so it doesn't visibly reshuffle mid-question)
//   and wrong taps vanish from the bank - same "vanishing wrong choices"
//   pattern as components/flashcardcomponent.tsx's multiple choice, for
//   consistency with the rest of the app.
// - 'type': a free-text input checked against isCorrectBlankAnswer, which
//   accepts either kana or romaji. Wrong answers can be edited and
//   rechecked - editing after a wrong Check clears the wrong-answer message
//   rather than leaving a stale one up.
// Getting a question wrong doesn't block anything else - the whole Test
// panel is just sitting on the page, not a gate to pass. ---
function BlankExercise({
  colors, blank, inputMode,
}: {
  colors: any; blank: LessonBlank; inputMode: ExerciseInputMode;
}) {
  const [wordBank] = useState(() => buildWordBank(blank));
  const [removedWords, setRemovedWords] = useState<string[]>([]);
  const [correct, setCorrect] = useState(false);
  const [typedValue, setTypedValue] = useState('');
  const [typedWrong, setTypedWrong] = useState(false);

  const correctDisplay = displayAnswer(blank);
  const visibleWords = wordBank.filter(w => !removedWords.includes(w));

  const handleTap = (word: string) => {
    if (correct) return;
    if (word === correctDisplay) {
      setCorrect(true);
    } else {
      setRemovedWords(prev => [...prev, word]);
    }
  };

  const handleCheckTyped = () => {
    if (!typedValue.trim()) return;
    if (isCorrectBlankAnswer(typedValue, blank)) {
      setCorrect(true);
      setTypedWrong(false);
    } else {
      setTypedWrong(true);
    }
  };

  const slotText = correct ? (inputMode === 'tap' ? correctDisplay : typedValue) : '_____';

  return (
    <View style={[styles.blankCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Text style={[styles.blankSentence, { color: colors.text }]}>
        {blank.promptBefore}
        <Text style={[
          styles.blankSlot,
          { borderColor: colors.border, color: colors.textFaint },
          correct && { borderColor: colors.accent, color: colors.accent },
        ]}>
          {` ${slotText} `}
        </Text>
        {blank.promptAfter}
      </Text>

      {inputMode === 'tap' ? (
        correct ? (
          <Text style={[styles.blankFeedback, { color: colors.accent }]}>Correct!</Text>
        ) : (
          <View style={styles.wordBankRow}>
            {visibleWords.map((word, i) => (
              <TouchableOpacity
                key={`${word}-${i}`}
                onPress={() => handleTap(word)}
                style={[styles.wordBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.wordBubbleText, { color: colors.text }]}>{word}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )
      ) : (
        <>
          <View style={styles.typedRow}>
            <TextInput
              value={typedValue}
              onChangeText={t => { setTypedValue(t); setTypedWrong(false); }}
              editable={!correct}
              placeholder="Type your answer..."
              placeholderTextColor={colors.textFaint}
              style={[styles.typedInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              onSubmitEditing={handleCheckTyped}
            />
            {!correct && (
              <TouchableOpacity onPress={handleCheckTyped} style={[styles.checkButton, { backgroundColor: colors.accent }]}>
                <Text style={[styles.checkButtonText, { color: colors.accentText }]}>Check</Text>
              </TouchableOpacity>
            )}
          </View>
          {correct && <Text style={[styles.blankFeedback, { color: colors.accent }]}>Correct!</Text>}
          {typedWrong && <Text style={[styles.blankFeedback, { color: colors.danger }]}>Not quite - try again.</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  containerNarrow: {
    flex: 1,
    flexDirection: 'column',
  },
  leftPanel: {
    width: 200,
    borderRightWidth: 1,
    padding: 16,
  },
  leftPanelNarrow: {
    width: '100%',
    borderBottomWidth: 1,
    padding: 12,
  },
  navRowNarrow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  navItemNarrow: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  navItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  navText: {
    fontSize: 14,
  },
  mainPanel: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
  },
  lessonCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  lessonTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  lessonSubtitle: {
    fontSize: 13,
  },
  backRow: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  // --- Practical Lessons click-through ---
  stepIndicator: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: -12,
    marginBottom: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  stepCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  // Page-turn arrows anchored to the bottom corners of the step card
  // itself, replacing the old full-width Back/Next button row below it.
  pageTurnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  pageTurnButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTurnButtonDisabled: {
    opacity: 0.3,
  },
  pageTurnArrow: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 26,
  },
  // --- The "open book" Test panel (LessonTestPanel) ---
  testPanel: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  testPanelTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  testPanelHint: {
    fontSize: 13,
    marginBottom: 16,
  },
  testQuestion: {
    marginBottom: 18,
  },
  testQuestionNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  // --- Fill-in-the-blank (BlankExercise) ---
  blankCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
  },
  blankSentence: {
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 14,
  },
  blankSlot: {
    fontWeight: 'bold',
    borderBottomWidth: 2,
  },
  blankFeedback: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  wordBankRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordBubble: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  wordBubbleText: {
    fontSize: 14,
  },
  typedRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typedInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  checkButton: {
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
