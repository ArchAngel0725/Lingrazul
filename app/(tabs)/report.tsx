// ALark-Claude_Review@MEGADATA
// report.tsx - "Report Bug" tab. Anyone (guest or logged in) can submit a
// free-text bug report, gated behind a simple client-side human-check (a
// random math question + a hidden honeypot field) rather than a real
// server-verified captcha - see supabase/sql/bug_reports.sql for the
// reasoning and the RLS policy this relies on.

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { usePreferences } from '../../lib/preferences';
import { submitBugReport } from '../../lib/bugReports';

// Generates a fresh small-number addition question. Regenerated every time
// the challenge is shown or failed, so a bot can't just hardcode one answer.
const makeChallenge = () => {
  const a = Math.floor(Math.random() * 8) + 1;
  const b = Math.floor(Math.random() * 8) + 1;
  return { a, b, answer: a + b };
};

export default function ReportBugScreen() {
  const { colors } = usePreferences();
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  // Honeypot - a field real users never see or fill. Named to look
  // plausible/attractive to a form-filling bot. If this has anything in it
  // on submit, the report is silently dropped without an error, since a
  // real human never could have typed into it.
  const [website, setWebsite] = useState('');
  const [challenge, setChallenge] = useState(makeChallenge);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEmail('');
    setWebsite('');
    setChallengeAnswer('');
    setChallenge(makeChallenge());
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess(false);

    if (website.trim().length > 0) {
      // Honeypot tripped - a bot filled a field it should never have seen.
      // Pretend it worked so the bot doesn't learn anything, but don't
      // actually write to the database.
      resetForm();
      setSuccess(true);
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError('Please fill in both a title and a description.');
      return;
    }

    if (Number(challengeAnswer) !== challenge.answer) {
      setError("That answer isn't right - try again.");
      setChallenge(makeChallenge());
      setChallengeAnswer('');
      return;
    }

    setSubmitting(true);
    try {
      await submitBugReport({ title, description, email, userId });
      resetForm();
      setSuccess(true);
    } catch (err) {
      setError('Could not submit that - please try again in a moment.');
      console.warn('report: submitBugReport failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Report a Bug</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Found something broken or confusing? Let us know below - no account required.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>Details</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Title</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
          placeholder="Short summary of the issue"
          placeholderTextColor={colors.textFaint}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={[styles.label, { color: colors.textMuted, marginTop: 14 }]}>Description</Text>
        <TextInput
          style={[
            styles.input, styles.multilineInput,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="What happened? What did you expect instead?"
          placeholderTextColor={colors.textFaint}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
        />

        <Text style={[styles.label, { color: colors.textMuted, marginTop: 14 }]}>Email (optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
          placeholder="If you'd like a reply"
          placeholderTextColor={colors.textFaint}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Honeypot - hidden from real users via layout, not just opacity,
            so screen readers and layout-based bots both skip past it. */}
        <View style={styles.honeypot} pointerEvents="none">
          <TextInput
            value={website}
            onChangeText={setWebsite}
            tabIndex={-1}
            autoCapitalize="none"
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textFaint, marginTop: 20 }]}>Quick check</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          What is {challenge.a} + {challenge.b}?
        </Text>
        <TextInput
          style={[styles.input, styles.challengeInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
          placeholder="Your answer"
          placeholderTextColor={colors.textFaint}
          value={challengeAnswer}
          onChangeText={setChallengeAnswer}
          keyboardType="number-pad"
        />
      </View>

      {error ? <Text style={[styles.feedbackText, { color: colors.danger }]}>{error}</Text> : null}
      {success ? (
        <Text style={[styles.feedbackText, { color: colors.textMuted }]}>
          Thanks - your report was submitted.
        </Text>
      ) : null}

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: colors.accent }, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Report'}</Text>
      </TouchableOpacity>
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
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  challengeInput: {
    maxWidth: 140,
  },
  honeypot: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
    overflow: 'hidden',
  },
  feedbackText: {
    fontSize: 13,
    marginTop: 14,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
