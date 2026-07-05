// preferences.tsx - App-wide user preferences (theme, audio) with local
// persistence via AsyncStorage. There is no user-profile table in Supabase
// yet (see AGENTS.md project-state notes), so these live on-device only -
// they will not follow the user to a different device or survive a
// reinstall. Promote to a Supabase-backed table later if that's needed.

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, ColorScheme, ThemeColors, colorsFor } from './theme';

const THEME_MODE_KEY = 'lingrazul:themeMode';
const MUTED_KEY = 'lingrazul:muted';
const ANNOUNCE_MODE_KEY = 'lingrazul:announceMode';
const CUSTOM_CELEBRATION_ENABLED_KEY = 'lingrazul:customCelebrationEnabled';
const CUSTOM_CELEBRATION_URI_KEY = 'lingrazul:customCelebrationSoundUri';
const CUSTOM_CELEBRATION_NAME_KEY = 'lingrazul:customCelebrationSoundName';

// What plays automatically after tapping the correct answer on a flashcard:
// - 'correct': speaks the actual reading (same audio as tapping the
//   question to hear it), so you get confirmation of the real pronunciation
//   every time without needing the tap-to-hear hint. This still counts
//   normally towards accuracy - it's not the same as the tap-to-hear hint,
//   which intentionally zeroes out scoring for that card.
// - 'celebration': the existing random Japanese exclamation + pitch/rate
//   variation behavior.
// Either way, muted still silences it entirely (checked at the call site).
export type AnnounceMode = 'correct' | 'celebration';

interface PreferencesContextValue {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  scheme: ColorScheme;
  colors: ThemeColors;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  announceMode: AnnounceMode;
  setAnnounceMode: (mode: AnnounceMode) => void;
  // Custom celebration sound: lets a user swap the built-in random
  // Japanese exclamations for their own audio file (picked in Settings).
  // Only takes effect when announceMode is 'celebration' - 'correct' mode
  // always speaks the reading regardless of these. customCelebrationSoundUri
  // is a local file:// (native, copied into permanent app storage so it
  // survives restarts) or blob:/data: (web) URI - null means nothing's been
  // picked yet, in which case the built-in phrases are used even if enabled.
  customCelebrationEnabled: boolean;
  setCustomCelebrationEnabled: (enabled: boolean) => void;
  customCelebrationSoundUri: string | null;
  customCelebrationSoundName: string | null;
  setCustomCelebrationSound: (uri: string | null, name: string | null) => void;
  // True once the persisted values have been read from disk. Screens that
  // care about flicker (e.g. showing the wrong theme for a frame) can wait
  // on this before rendering anything theme-sensitive.
  ready: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [muted, setMutedState] = useState(false);
  const [announceMode, setAnnounceModeState] = useState<AnnounceMode>('celebration');
  const [customCelebrationEnabled, setCustomCelebrationEnabledState] = useState(false);
  const [customCelebrationSoundUri, setCustomCelebrationSoundUriState] = useState<string | null>(null);
  const [customCelebrationSoundName, setCustomCelebrationSoundNameState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [
          storedTheme,
          storedMuted,
          storedAnnounceMode,
          storedCustomEnabled,
          storedCustomUri,
          storedCustomName,
        ] = await Promise.all([
          AsyncStorage.getItem(THEME_MODE_KEY),
          AsyncStorage.getItem(MUTED_KEY),
          AsyncStorage.getItem(ANNOUNCE_MODE_KEY),
          AsyncStorage.getItem(CUSTOM_CELEBRATION_ENABLED_KEY),
          AsyncStorage.getItem(CUSTOM_CELEBRATION_URI_KEY),
          AsyncStorage.getItem(CUSTOM_CELEBRATION_NAME_KEY),
        ]);
        if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
          setThemeModeState(storedTheme);
        }
        if (storedMuted != null) {
          setMutedState(storedMuted === 'true');
        }
        if (storedAnnounceMode === 'correct' || storedAnnounceMode === 'celebration') {
          setAnnounceModeState(storedAnnounceMode);
        }
        if (storedCustomEnabled != null) {
          setCustomCelebrationEnabledState(storedCustomEnabled === 'true');
        }
        if (storedCustomUri != null) {
          setCustomCelebrationSoundUriState(storedCustomUri);
        }
        if (storedCustomName != null) {
          setCustomCelebrationSoundNameState(storedCustomName);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_MODE_KEY, mode).catch(() => {});
  };

  const setMuted = (value: boolean) => {
    setMutedState(value);
    AsyncStorage.setItem(MUTED_KEY, String(value)).catch(() => {});
  };

  const setAnnounceMode = (mode: AnnounceMode) => {
    setAnnounceModeState(mode);
    AsyncStorage.setItem(ANNOUNCE_MODE_KEY, mode).catch(() => {});
  };

  const setCustomCelebrationEnabled = (enabled: boolean) => {
    setCustomCelebrationEnabledState(enabled);
    AsyncStorage.setItem(CUSTOM_CELEBRATION_ENABLED_KEY, String(enabled)).catch(() => {});
  };

  // uri/name null (e.g. "Remove sound") clears the persisted values instead
  // of writing the literal string "null".
  const setCustomCelebrationSound = (uri: string | null, name: string | null) => {
    setCustomCelebrationSoundUriState(uri);
    setCustomCelebrationSoundNameState(name);
    if (uri === null) {
      AsyncStorage.removeItem(CUSTOM_CELEBRATION_URI_KEY).catch(() => {});
    } else {
      AsyncStorage.setItem(CUSTOM_CELEBRATION_URI_KEY, uri).catch(() => {});
    }
    if (name === null) {
      AsyncStorage.removeItem(CUSTOM_CELEBRATION_NAME_KEY).catch(() => {});
    } else {
      AsyncStorage.setItem(CUSTOM_CELEBRATION_NAME_KEY, name).catch(() => {});
    }
  };

  const scheme: ColorScheme = themeMode === 'system'
    ? (systemScheme === 'light' ? 'light' : 'dark')
    : themeMode;
  const colors = colorsFor(scheme);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      themeMode, setThemeMode, scheme, colors, muted, setMuted, announceMode, setAnnounceMode,
      customCelebrationEnabled, setCustomCelebrationEnabled,
      customCelebrationSoundUri, customCelebrationSoundName, setCustomCelebrationSound,
      ready,
    }),
    [
      themeMode, scheme, colors, muted, announceMode,
      customCelebrationEnabled, customCelebrationSoundUri, customCelebrationSoundName,
      ready,
    ]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences() must be used within a <PreferencesProvider>');
  }
  return ctx;
}
