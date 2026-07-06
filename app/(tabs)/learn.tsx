// ALark-Claude_Review@MEGADATA
// learn.tsx - "Basics" tab: a list of curated lessons, tap into one to read
// its sections. Replaces the old placeholder screen that just showed the
// word "Learn". Content comes from lib/lessons.ts (lessons/lesson_sections
// tables, see supabase/sql/v2_lessons_schema.sql) - hand-authored official
// content, not user-submitted ("community lessons" is a separate, deferred
// idea - see AGENTS.md).
//
// Lessons are ordered the way a textbook would order them: script/reading
// fundamentals (hiragana, katakana) before any grammar/vocab lesson exists.
// An "app orientation" lesson is intentionally NOT in scope yet - the app
// itself is still actively changing, so that lesson would go stale fast.

import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { usePreferences } from '../../lib/preferences';
import { fetchLessons, fetchLessonDetail, LessonSummary, LessonSection } from '../../lib/lessons';

type ViewState =
  | { mode: 'list' }
  | { mode: 'detail'; lesson: LessonSummary; sections: LessonSection[] | null };

export default function LearnScreen() {
  const { colors } = usePreferences();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [view, setView] = useState<ViewState>({ mode: 'list' });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setView({ mode: 'list' });

      (async () => {
        setLoading(true);
        const data = await fetchLessons('ja');
        if (active) {
          setLessons(data);
          setLoading(false);
        }
      })();

      return () => { active = false; };
    }, [])
  );

  const openLesson = async (lesson: LessonSummary) => {
    setView({ mode: 'detail', lesson, sections: null });
    const sections = await fetchLessonDetail(lesson.id);
    setView({ mode: 'detail', lesson, sections });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.text} size="large" />
      </View>
    );
  }

  if (view.mode === 'detail') {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <TouchableOpacity onPress={() => setView({ mode: 'list' })} style={styles.backRow}>
          <Text style={[styles.backText, { color: colors.textMuted }]}>{'‹ Basics'}</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>{view.lesson.title}</Text>

        {view.sections === null ? (
          <ActivityIndicator color={colors.text} style={{ marginTop: 24 }} />
        ) : (
          view.sections.map(section => (
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Basics</Text>

      {lessons.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No lessons yet</Text>
          <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
            Lessons are on their way - check back soon.
          </Text>
        </View>
      ) : (
        lessons.map(lesson => (
          <TouchableOpacity
            key={lesson.id}
            style={[styles.lessonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => openLesson(lesson)}
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

const styles = StyleSheet.create({
  container: {
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
});
