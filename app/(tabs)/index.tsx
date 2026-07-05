// ALark-Claude_Review@MEGADATA
// index.tsx - Home screen. Static Updates/Upcoming content for now - there's
// no announcements/roadmap table in Supabase, so this is hand-maintained
// and should be updated as things ship or slip. Reflects real project state
// as of 2026-07-05 (see AGENTS.md).

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { usePreferences } from '../../lib/preferences';

interface Entry {
  title: string;
  body: string;
}

const UPDATES: Entry[] = [
  { title: 'Settings & theming', body: 'Light/Dark/System theme, account status, and flashcard filter reset now live under Settings.' },
  { title: 'Flash card fixes', body: 'Refills now respect every applied category (word and letter). Decoys can no longer come from the same row as the correct answer.' },
  { title: 'Particle pronunciation', body: 'は and へ are now spoken as "wa"/"e" when used as grammatical particles, not their base kana reading.' },
];

const UPCOMING: Entry[] = [
  { title: 'Stats that actually save', body: 'Category-by-category accuracy is built, but nothing writes to user_progress yet - flashcard answers need to be persisted next.' },
  { title: 'Community lessons', body: 'Layout is in place for browsing and forums. Claude-assisted lesson creation is the next big piece.' },
  { title: 'Adaptive difficulty', body: 'The "Too hard" / "Too easy" buttons on flashcards are still no-ops - they will drive difficulty weighting once progress is tracked.' },
  { title: 'Audio & video lessons', body: 'Whisper-based transcription and native audio playback are planned but not started.' },
];

export default function HomeScreen() {
  const { colors } = usePreferences();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Lingrazul</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>言語を学ぶ</Text>

      <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>Updates</Text>
      {UPDATES.map(entry => (
        <View key={entry.title} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{entry.title}</Text>
          <Text style={[styles.cardBody, { color: colors.textMuted }]}>{entry.body}</Text>
        </View>
      ))}

      <Text style={[styles.sectionTitle, { color: colors.textFaint, marginTop: 24 }]}>Upcoming</Text>
      {UPCOMING.map(entry => (
        <View key={entry.title} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{entry.title}</Text>
          <Text style={[styles.cardBody, { color: colors.textMuted }]}>{entry.body}</Text>
        </View>
      ))}
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
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  sub: {
    fontSize: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 19,
  },
});
