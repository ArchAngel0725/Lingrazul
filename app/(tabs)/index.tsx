// ALark-Claude_Review@MEGADATA
// index.tsx - Home screen. Static Updates/Upcoming content for now - there's
// no announcements/roadmap table in Supabase, so this is hand-maintained
// and should be updated as things ship or slip. Reflects real project state
// as of 2026-07-07 (see AGENTS.md).

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { usePreferences } from '../../lib/preferences';


const PATREON_URL = 'https://www.patreon.com/MegaData';

interface Entry {
  title: string;
  body: string;
}

const UPDATES: Entry[] = [
  { title: 'Support us on Patreon', body: 'There’s now a Patreon link right on this Home screen for anyone who wants to help support development.' },
  { title: 'Pictures on flash cards', body: 'Flash cards can now show a picture above the word - animals, numbers, body parts, nature, places, and common verbs already display an emoji as a free placeholder, with real photos able to replace them later with no other changes. Most grammar words and abstract kanji intentionally stay text-only, same as before.' },
  { title: 'Practical Lessons', body: 'A second track under Basics, read one step at a time instead of one long page. Every lesson ends in a Test panel you can answer by tapping word choices or typing the answer yourself, in kana or romaji - switchable in Settings. First lesson up: Basic Phrases (everyday greetings).' },
  { title: 'Pronunciation fix', body: 'Fixed a bug where quizzing on a reading in "romaji" mode could speak the raw English letters instead of the actual Japanese pronunciation.' },
  { title: 'Theme fix', body: 'Light/Dark/System could get stuck showing the wrong appearance after the app sat idle for a while, or on first load. It now corrects itself automatically instead of needing a trip to Settings.' },
  { title: 'New look', body: 'New app icon, and the tab bar now has icons instead of a broken image on mobile.' },
  { title: 'Basics lessons', body: 'The Basics tab now has real lesson content instead of a placeholder. Hiragana and Katakana primers are up first, with more lessons planned in textbook order.' },
  { title: 'Real per-user progress tracking', body: 'Letters, words, and kanji now each track their own accuracy per account, replacing an older table that had stopped working correctly. The Stats page reads straight from this.' },
  { title: 'Fairer flashcard shuffling', body: 'Selecting several categories now pulls an even mix from all of them, instead of one or two categories dominating every session.' },
  { title: 'Rebuilt content database', body: 'Letters, words, and kanji now live in a proper shared structure instead of one-off tables per language. Kanji readings and meanings are tracked separately for the first time, setting up richer kanji content and additional languages down the road.' },
  { title: 'Settings & theming', body: 'Light/Dark/System theme, account status, and flashcard filter reset now live under Settings.' },
  { title: 'Flash card fixes', body: 'Refills now respect every applied category (word and letter). Decoys can no longer come from the same row as the correct answer.' },
  { title: 'Particle pronunciation', body: 'は and へ are now spoken as "wa"/"e" when used as grammatical particles, not their base kana reading.' },
];

const UPCOMING: Entry[] = [
  { title: 'Adaptive study modes', body: 'With per-item accuracy now tracked, the next step is new ways to pick which cards come up - starting with a mode that leans on whatever you’re scoring lowest on, instead of pure random.' },
  { title: 'Messaging, forums & community lessons', body: 'A Discord/Facebook-style way to message other users, post in language forums, and eventually author your own lessons is being scoped out. On hold for now - it needs its own foundation (user profiles, moderation) before work starts.' },
  { title: 'Audio & video lessons', body: 'Whisper-based transcription and native audio playback are planned but not started.' },
];

export default function HomeScreen() {
  const { colors } = usePreferences();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Image
        source={require('../../assets/Lingrazul_Logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={[styles.title, { color: colors.text }]}>Lingrazul</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>言語を学ぶ</Text>

      <TouchableOpacity
        style={[styles.patreonButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => Linking.openURL(PATREON_URL)}
      >
        <Text style={[styles.patreonText, { color: colors.text }]}>♥ Support Lingrazul on Patreon</Text>
      </TouchableOpacity>

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
  logo: {
    width: 120,
    height: 120,
    borderRadius: 16,
    marginBottom: 12,
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
  patreonButton: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  patreonText: {
    fontSize: 14,
    fontWeight: 'bold',
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
