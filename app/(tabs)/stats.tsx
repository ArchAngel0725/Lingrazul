// ALark-Claude_Review@MEGADATA
// stats.tsx - Flashcards panel: overall accuracy summary plus a collapsible
// "By Category" breakdown covering every category on the Flash Cards tab
// (word + letter), pulled from word_progress/letter_progress/kanji_progress.
// See lib/stats.ts for the aggregation logic and the assumptions it's
// making about the live schema.
// Structured as one clearly-labeled panel so future stat sources (e.g.
// community lessons) can be added as their own panels later.

import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { usePreferences } from '../../lib/preferences';
import { fetchStatsSummary, StatsSummary } from '../../lib/stats';

export default function StatsScreen() {
  const { colors } = usePreferences();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user?.id ?? null;

        if (!active) return;
        setLoggedIn(!!userId);

        if (userId) {
          const stats = await fetchStatsSummary(userId);
          if (active) setSummary(stats);
        } else {
          setSummary(null);
        }
        if (active) setLoading(false);
      })();

      return () => { active = false; };
    }, [])
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.text} size="large" />
      </View>
    );
  }

  if (!loggedIn) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No stats yet</Text>
        <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
          Stats are only saved for an account. You're browsing as a guest right now.
        </Text>
        <TouchableOpacity
          style={[styles.signUpButton, { backgroundColor: colors.accent }]}
          onPress={() => router.push('/login?mode=signup')}
        >
          <Text style={[styles.signUpText, { color: colors.accentText }]}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No stats yet</Text>
        <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
          Answer some flashcards and your accuracy will start showing up here.
        </Text>
      </View>
    );
  }

  const wordCategories = summary.categories.filter(c => c.contentType === 'word');
  const letterCategories = summary.categories.filter(c => c.contentType === 'letter');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Stats</Text>

      {/* Flashcards panel - the only stats source right now. Kept as a
          clearly labeled section so other panels (e.g. community lessons)
          can sit alongside it later without restructuring this one. */}
      <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>Flashcards</Text>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{summary.overallAccuracyPercent}%</Text>
          <Text style={[styles.summaryLabel, { color: colors.textFaint }]}>Overall accuracy</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{summary.itemsTracked}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textFaint }]}>Items tracked</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{summary.totalExposures}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textFaint }]}>Total answers</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.dropdownHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setCategoriesOpen(o => !o)}
      >
        <Text style={[styles.dropdownTitle, { color: colors.text }]}>By Category</Text>
        <Text style={[styles.dropdownChevron, { color: colors.textFaint }]}>{categoriesOpen ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {categoriesOpen && (
        <View style={[styles.dropdownBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {wordCategories.length > 0 && (
            <>
              <Text style={[styles.groupLabel, { color: colors.textFaint }]}>Words</Text>
              {wordCategories.map(cat => (
                <CategoryRow key={`word:${cat.category}`} stat={cat} colors={colors} />
              ))}
            </>
          )}

          {letterCategories.length > 0 && (
            <>
              <Text style={[styles.groupLabel, { color: colors.textFaint, marginTop: wordCategories.length > 0 ? 16 : 0 }]}>
                Letters
              </Text>
              {letterCategories.map(cat => (
                <CategoryRow key={`letter:${cat.category}`} stat={cat} colors={colors} />
              ))}
            </>
          )}

          {wordCategories.length === 0 && letterCategories.length === 0 && (
            <Text style={[styles.emptyBody, { color: colors.textMuted }]}>No category data yet.</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function CategoryRow({ stat, colors }: { stat: { category: string; exposures: number; accuracyPercent: number }; colors: any }) {
  return (
    <View style={styles.categoryRow}>
      <Text style={[styles.categoryName, { color: colors.text }]}>{stat.category}</Text>
      <Text style={[styles.categoryMeta, { color: colors.textFaint }]}>{stat.exposures} answers</Text>
      <Text style={[styles.categoryPercent, { color: colors.text }]}>{stat.accuracyPercent}%</Text>
    </View>
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
    padding: 32,
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 320,
  },
  signUpButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  signUpText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
    textAlign: 'center',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  dropdownTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  dropdownChevron: {
    fontSize: 14,
  },
  dropdownBody: {
    borderRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    padding: 16,
    marginTop: -1,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  categoryMeta: {
    fontSize: 12,
    marginRight: 12,
  },
  categoryPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    width: 44,
    textAlign: 'right',
  },
});
