// preferences.tsx - App-wide user preferences (theme, audio) with local
// persistence via AsyncStorage. There is no user-profile table in Supabase
// yet (see AGENTS.md project-state notes), so these live on-device only -
// they will not follow the user to a different device or survive a
// reinstall. Promote to a Supabase-backed table later if that's needed.

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useColorScheme, Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, ColorScheme, ThemeColors, colorsFor } from './theme';

const THEME_MODE_KEY = 'lingrazul:themeMode';
const MUTED_KEY = 'lingrazul:muted';
const ANNOUNCE_MODE_KEY = 'lingrazul:announceMode';
const CUSTOM_CELEBRATION_ENABLED_KEY = 'lingrazul:customCelebrationEnabled';
const CUSTOM_CELEBRATION_URI_KEY = 'lingrazul:customCelebrationSoundUri';
const CUSTOM_CELEBRATION_NAME_KEY = 'lingrazul:customCelebrationSoundName';
const EXERCISE_INPUT_MODE_KEY = 'lingrazul:exerciseInputMode';
const SHOW_PICTURES_KEY = 'lingrazul:showPictures';

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

// How a Practical Lesson's fill-in-the-blank steps (see
// lib/lessonBlanks.ts) are answered:
// - 'tap': fill the blank by tapping a word bubble from a shuffled bank
//   (the correct answer plus decoys) - no keyboard/IME needed.
// - 'type': type the answer directly, in either kana or romaji (see
//   lib/lessonBlanks.ts's isCorrectBlankAnswer).
// Defaults to 'tap' since it works identically on every device without
// needing a Japanese keyboard set up first.
export type ExerciseInputMode = 'tap' | 'type';

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
  exerciseInputMode: ExerciseInputMode;
  setExerciseInputMode: (mode: ExerciseInputMode) => void;
  // Whether Flash Cards shows a row's photo/emoji at all. On by default -
  // when a row has one, this also switches that card into picture-quiz mode
  // (see lib/cardDisplay.ts's hasCardPicture) instead of its usual
  // question/answer script pair. Off restores the pre-picture-feature
  // behavior unconditionally, regardless of what a row's image_url/emoji
  // columns hold.
  showPictures: boolean;
  setShowPictures: (show: boolean) => void;
  // True once the persisted values have been read from disk. Screens that
  // care about flicker (e.g. showing the wrong theme for a frame) can wait
  // on this before rendering anything theme-sensitive.
  ready: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const rnSystemScheme = useColorScheme();
  // react-native-web's useColorScheme()/Appearance change listener can miss
  // updates that happen while the tab was backgrounded or the device was
  // asleep - the underlying `prefers-color-scheme` media-query change event
  // doesn't get queued/replayed once JS resumes, so the hook can keep
  // reporting whatever scheme was current when the tab was last active.
  // This is exactly the bug reported: theme is wrong on cold load or after
  // the app sat asleep, and only "fixes itself" once something forces a
  // re-render with an explicit (non-'system') themeMode. liveSystemScheme
  // starts from the same hook but is explicitly re-synced (see the effect
  // below) whenever the page becomes visible/focused again, so a stale
  // read gets corrected without the user having to touch Settings.
  // Starts at 'light' unconditionally - NOT derived from rnSystemScheme -
  // because that's exactly what react-native-web's Appearance.getColorScheme()
  // itself falls back to when there's no `window` (see its `canUseDOM` guard),
  // which is the environment the static web export's prerender runs in. If
  // this initializer read the real client-side value instead, any visitor
  // whose OS is actually in dark mode would get a genuinely different
  // colorScheme (and therefore different themed styles) on their first
  // client render than what's already sitting in the static HTML - a real
  // mismatch, not just a stale one, causing a React hydration error
  // (minified #418) that force-discards and rebuilds the whole tree client
  // side. The effects below correct this to the real value immediately
  // after mount, which happens after hydration completes and is therefore
  // just a normal client-side update, not compared against server markup.
  const [liveSystemScheme, setLiveSystemScheme] = useState<ColorScheme>('light');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [muted, setMutedState] = useState(false);
  const [announceMode, setAnnounceModeState] = useState<AnnounceMode>('celebration');
  const [customCelebrationEnabled, setCustomCelebrationEnabledState] = useState(false);
  const [customCelebrationSoundUri, setCustomCelebrationSoundUriState] = useState<string | null>(null);
  const [customCelebrationSoundName, setCustomCelebrationSoundNameState] = useState<string | null>(null);
  const [exerciseInputMode, setExerciseInputModeState] = useState<ExerciseInputMode>('tap');
  const [showPictures, setShowPicturesState] = useState(true);
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
          storedExerciseInputMode,
          storedShowPictures,
        ] = await Promise.all([
          AsyncStorage.getItem(THEME_MODE_KEY),
          AsyncStorage.getItem(MUTED_KEY),
          AsyncStorage.getItem(ANNOUNCE_MODE_KEY),
          AsyncStorage.getItem(CUSTOM_CELEBRATION_ENABLED_KEY),
          AsyncStorage.getItem(CUSTOM_CELEBRATION_URI_KEY),
          AsyncStorage.getItem(CUSTOM_CELEBRATION_NAME_KEY),
          AsyncStorage.getItem(EXERCISE_INPUT_MODE_KEY),
          AsyncStorage.getItem(SHOW_PICTURES_KEY),
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
        if (storedExerciseInputMode === 'tap' || storedExerciseInputMode === 'type') {
          setExerciseInputModeState(storedExerciseInputMode);
        }
        if (storedShowPictures != null) {
          setShowPicturesState(storedShowPictures === 'true');
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Normal path: keep liveSystemScheme in sync whenever react-native's own
  // Appearance change listener does fire correctly.
  useEffect(() => {
    setLiveSystemScheme(rnSystemScheme === 'light' ? 'light' : 'dark');
  }, [rnSystemScheme]);

  // Safety-net path for the case that listener misses: explicitly re-read
  // Appearance.getColorScheme() the moment the page/tab becomes visible or
  // focused again (the "just woke up from sleep" moment), plus once eagerly
  // on mount to also cover a stale value at cold hydration. Web-only -
  // native's AppState-driven Appearance updates don't have this gap, and
  // `document`/`window` aren't available off-web.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const recheckSystemScheme = () => {
      const current = Appearance.getColorScheme();
      setLiveSystemScheme(current === 'light' ? 'light' : 'dark');
    };
    recheckSystemScheme();
    document.addEventListener('visibilitychange', recheckSystemScheme);
    window.addEventListener('focus', recheckSystemScheme);
    return () => {
      document.removeEventListener('visibilitychange', recheckSystemScheme);
      window.removeEventListener('focus', recheckSystemScheme);
    };
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

  const setExerciseInputMode = (mode: ExerciseInputMode) => {
    setExerciseInputModeState(mode);
    AsyncStorage.setItem(EXERCISE_INPUT_MODE_KEY, mode).catch(() => {});
  };

  const setShowPictures = (show: boolean) => {
    setShowPicturesState(show);
    AsyncStorage.setItem(SHOW_PICTURES_KEY, String(show)).catch(() => {});
  };

  const scheme: ColorScheme = themeMode === 'system' ? liveSystemScheme : themeMode;
  const colors = colorsFor(scheme);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      themeMode, setThemeMode, scheme, colors, muted, setMuted, announceMode, setAnnounceMode,
      customCelebrationEnabled, setCustomCelebrationEnabled,
      customCelebrationSoundUri, customCelebrationSoundName, setCustomCelebrationSound,
      exerciseInputMode, setExerciseInputMode,
      showPictures, setShowPictures,
      ready,
    }),
    [
      themeMode, scheme, colors, muted, announceMode,
      customCelebrationEnabled, customCelebrationSoundUri, customCelebrationSoundName,
      exerciseInputMode, showPictures,
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
