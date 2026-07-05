// ALark-Claude_Review@MEGADATA
// community.tsx - Layout only, no Supabase queries yet. Left nav switches
// between the two language forums and the community lessons browser.
// The Lessons view is where lesson creation eventually gets wired to
// Claude (user provides a topic/source, Claude structures it into a
// lesson) - the "Create Lesson" button here is a placeholder for that.

import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { usePreferences } from '../../lib/preferences';
import { useIsNarrow } from '../../lib/responsive';

type Section = 'ja-forum' | 'en-forum' | 'lessons';

const NAV_ITEMS: { key: Section; label: string }[] = [
  { key: 'ja-forum', label: 'Japanese Forum' },
  { key: 'en-forum', label: 'English Forum' },
  { key: 'lessons', label: 'Lessons' },
];

export default function CommunityScreen() {
  const { colors } = usePreferences();
  const isNarrow = useIsNarrow();
  const [section, setSection] = useState<Section>('lessons');

  return (
    <View style={[isNarrow ? styles.containerNarrow : styles.container, { backgroundColor: colors.background }]}>
      {/* Left nav - stacks above the content and lays its items out
          horizontally on narrow screens instead of a tall vertical list
          down the side, since there's no room for a 200px side column on
          a phone-width viewport. */}
      <View style={[
        isNarrow ? styles.leftPanelNarrow : styles.leftPanel,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
      ]}>
        {!isNarrow && <Text style={[styles.panelTitle, { color: colors.textFaint }]}>Community</Text>}
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
                onPress={() => setSection(item.key)}
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

      {/* Main content */}
      <View style={styles.mainPanel}>
        {section === 'ja-forum' && <ForumView colors={colors} title="Japanese Forum" subtitle="For people learning Japanese" />}
        {section === 'en-forum' && <ForumView colors={colors} title="English Forum" subtitle="For people learning English" />}
        {section === 'lessons' && <LessonsView colors={colors} />}
      </View>
    </View>
  );
}

function ForumView({ colors, title, subtitle }: { colors: any; title: string; subtitle: string }) {
  return (
    <ScrollView contentContainerStyle={styles.mainContent}>
      <Text style={[styles.pageTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>

      <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]} disabled>
        <Text style={[styles.primaryButtonText, { color: colors.textFaint }]}>New Thread (coming soon)</Text>
      </TouchableOpacity>

      <View style={[styles.emptyState, { borderColor: colors.border }]}>
        <Text style={[styles.emptyStateText, { color: colors.textFaint }]}>No threads yet - check back soon.</Text>
      </View>
    </ScrollView>
  );
}

function LessonsView({ colors }: { colors: any }) {
  return (
    <ScrollView contentContainerStyle={styles.mainContent}>
      <View style={styles.lessonsHeader}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Community Lessons</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Browse lessons made by other learners</Text>
        </View>
        <TouchableOpacity style={[styles.createButton, { backgroundColor: colors.accent }]} disabled>
          <Text style={[styles.createButtonText, { color: colors.accentText }]}>+ Create Lesson</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.aiHint, { color: colors.textFaint }]}>
        Lesson creation will be Claude-assisted - give it a topic or source material and it builds the lesson for you.
      </Text>

      <View style={[styles.emptyState, { borderColor: colors.border, marginTop: 12 }]}>
        <Text style={[styles.emptyStateText, { color: colors.textFaint }]}>No community lessons yet.</Text>
      </View>

      {/* Ghost card previewing the eventual lesson card layout */}
      <View style={[styles.lessonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.lessonCardTop}>
          <Text style={[styles.lessonCardTitle, { color: colors.textFaint }]}>Lesson title</Text>
          <Text style={[styles.lessonCardStars, { color: colors.textFaint }]}>★★★☆☆</Text>
        </View>
        <Text style={[styles.lessonCardMeta, { color: colors.textFaint }]}>0 likes · 0 completions</Text>
      </View>
    </ScrollView>
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
  mainContent: {
    padding: 32,
    maxWidth: 640,
    width: '100%',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  pageSubtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  primaryButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
  },
  lessonsHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  aiHint: {
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  lessonCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
    opacity: 0.5,
  },
  lessonCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lessonCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  lessonCardStars: {
    fontSize: 13,
  },
  lessonCardMeta: {
    fontSize: 12,
    marginTop: 6,
  },
});
