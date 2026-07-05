// ALark-Claude_Review@MEGADATA
// settings.tsx - Appearance, account, and misc app preferences.
//
// Theme persists locally via AsyncStorage (see lib/preferences.tsx). There
// is no user-profile table wired into the app yet, so none of this follows
// the user across devices/reinstalls - see the project-state notes in
// AGENTS.md for the current schema.
//
// Accounts are optional and, by design, nobody is signed in by default -
// this screen shows "Sign Up" until a session exists, then switches to
// showing the signed-in email and a "Sign Out" button.

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { supabase } from '../../lib/supabase';
import { usePreferences } from '../../lib/preferences';
import { clearStudyPreferences } from '../../lib/studyPreferences';
import { ThemeMode } from '../../lib/theme';

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
  { mode: 'system', label: 'System' },
];

export default function SettingsScreen() {
  const {
    colors, themeMode, setThemeMode,
    customCelebrationEnabled, setCustomCelebrationEnabled,
    customCelebrationSoundUri, customCelebrationSoundName, setCustomCelebrationSound,
  } = usePreferences();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [soundPickError, setSoundPickError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
      setEmail(data.session?.user?.email ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    setAuthBusy(true);
    await supabase.auth.signOut();
    setAuthBusy(false);
    router.replace('/login');
  };

  const handleSignUp = () => {
    router.push('/login?mode=signup');
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  // Opens the system file picker for an audio file, then makes sure it'll
  // still be around later. On native, the picker's uri usually lives in a
  // cache location the OS can clear at any time, so it gets copied into the
  // app's permanent document directory. On web there's no real filesystem
  // to copy into - expo-document-picker already returns a self-contained
  // data: URI there, which is safe to persist directly.
  const handlePickCelebrationSound = async () => {
    setSoundPickError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];

      if (Platform.OS === 'web') {
        setCustomCelebrationSound(asset.uri, asset.name);
        return;
      }

      const source = new File(asset.uri);
      const dest = new File(Paths.document, asset.name);
      await source.copy(dest, { overwrite: true });
      setCustomCelebrationSound(dest.uri, asset.name);
    } catch (err) {
      console.warn('settings: could not pick celebration sound', err);
      setSoundPickError('Could not use that file - try a different one.');
    }
  };

  const handleRemoveCelebrationSound = () => {
    setCustomCelebrationSound(null, null);
  };

  const handleResetFilters = () => {
    Alert.alert(
      'Reset flashcard filters?',
      'This clears your saved category, letter, and mode selections on the Flash Cards tab. It does not affect your account or progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearStudyPreferences();
            setResetConfirmation('Cleared - will apply next time you open Flash Cards.');
            setTimeout(() => setResetConfirmation(''), 4000);
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

      {/* Appearance */}
      <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>Appearance</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.segmented}>
          {THEME_OPTIONS.map(opt => {
            const active = themeMode === opt.mode;
            return (
              <TouchableOpacity
                key={opt.mode}
                style={[
                  styles.segment,
                  { borderColor: colors.border },
                  active && { backgroundColor: colors.accent, borderColor: colors.accent },
                ]}
                onPress={() => setThemeMode(opt.mode)}
              >
                <Text style={[
                  styles.segmentText,
                  { color: colors.textMuted },
                  active && { color: colors.accentText, fontWeight: 'bold' },
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Celebration Sound */}
      <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>Celebration Sound</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Use custom celebration sound</Text>
          <Switch
            value={customCelebrationEnabled}
            onValueChange={setCustomCelebrationEnabled}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.surface}
          />
        </View>
        <Text style={[styles.rowHint, { color: colors.textFaint }]}>
          When on and "Announce Celebration" is selected on a flashcard, this sound plays
          instead of the built-in Japanese phrases. Falls back to the built-in phrases if no
          file has been chosen yet, and is silenced by mute either way.
        </Text>

        <View style={styles.soundFileRow}>
          <Text style={[styles.rowLabel, { color: colors.textMuted, flexShrink: 1 }]} numberOfLines={1}>
            {customCelebrationSoundName ?? 'No file chosen'}
          </Text>
          {customCelebrationSoundName ? (
            <TouchableOpacity onPress={handleRemoveCelebrationSound}>
              <Text style={[styles.removeSoundText, { color: colors.danger }]}>Remove</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.chooseSoundButton, { backgroundColor: colors.accent }]}
          onPress={handlePickCelebrationSound}
        >
          <Text style={styles.signOutText}>Choose Sound File</Text>
        </TouchableOpacity>
        {soundPickError ? (
          <Text style={[styles.confirmationText, { color: colors.danger }]}>{soundPickError}</Text>
        ) : null}
      </View>

      {/* Learning */}
      <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>Learning</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.row} onPress={handleResetFilters}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Reset flashcard filters</Text>
          <Text style={[styles.rowChevron, { color: colors.textFaint }]}>›</Text>
        </TouchableOpacity>
        {resetConfirmation ? (
          <Text style={[styles.confirmationText, { color: colors.textMuted }]}>{resetConfirmation}</Text>
        ) : null}
      </View>

      {/* Account */}
      <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>Account</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {loggedIn ? (
          <>
            {email ? (
              <Text style={[styles.rowLabel, { color: colors.textMuted, marginBottom: 12 }]}>
                Signed in as {email}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[styles.signOutButton, { backgroundColor: colors.danger }]}
              onPress={handleSignOut}
              disabled={authBusy}
            >
              <Text style={styles.signOutText}>{authBusy ? 'Signing out...' : 'Sign Out'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.rowLabel, { color: colors.textMuted, marginBottom: 12 }]}>
              You're browsing as a guest. Sign up to save stats and access community lessons.
            </Text>
            <View style={styles.authButtonRow}>
              <TouchableOpacity
                style={[styles.authButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                onPress={handleSignIn}
              >
                <Text style={[styles.signOutText, { color: colors.text }]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authButton, { backgroundColor: colors.accent }]}
                onPress={handleSignUp}
              >
                <Text style={[styles.signOutText, { color: colors.accentText }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <Text style={[styles.footerText, { color: colors.textFaint }]}>
        Preferences are saved on this device only.
      </Text>
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 20,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  segmented: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 15,
    flexShrink: 1,
    paddingRight: 12,
  },
  rowChevron: {
    fontSize: 20,
  },
  rowHint: {
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
  soundFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  removeSoundText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  chooseSoundButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  confirmationText: {
    fontSize: 13,
    marginTop: 10,
  },
  signOutButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  authButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  authButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
});
