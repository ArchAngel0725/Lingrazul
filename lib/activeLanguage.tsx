// activeLanguage.tsx - Tracks which language the app is currently studying,
// the same way preferences.tsx tracks theme/mute/etc. Only Japanese exists
// as content today (see languageConfig.ts) and there's no UI to change
// this yet, so this always resolves to DEFAULT_LANGUAGE_CODE in practice -
// but every screen/lib function that needs "which language, and what are
// its quirks" reads through here (or takes a languageCode param defaulting
// to it) instead of writing 'ja' inline, so wiring up a real language
// switcher later is a UI change plus a second entry in
// languageConfig.ts's LANGUAGE_CONFIGS, not a grep-and-replace sweep.

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageConfig, getLanguageConfig, DEFAULT_LANGUAGE_CODE } from './languageConfig';

const ACTIVE_LANGUAGE_KEY = 'lingrazul:activeLanguageCode';

interface ActiveLanguageContextValue {
  languageCode: string;
  languageConfig: LanguageConfig;
  setLanguageCode: (code: string) => void;
  // True once the persisted value has been read from disk - mirrors
  // preferences.tsx's `ready`, same reasoning (avoid a flash of the wrong
  // language's quirks for one frame).
  ready: boolean;
}

const ActiveLanguageContext = createContext<ActiveLanguageContextValue | undefined>(undefined);

export function ActiveLanguageProvider({ children }: { children: ReactNode }) {
  const [languageCode, setLanguageCodeState] = useState<string>(DEFAULT_LANGUAGE_CODE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(ACTIVE_LANGUAGE_KEY);
        if (stored) setLanguageCodeState(stored);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setLanguageCode = (code: string) => {
    setLanguageCodeState(code);
    AsyncStorage.setItem(ACTIVE_LANGUAGE_KEY, code).catch(() => {});
  };

  const value = useMemo<ActiveLanguageContextValue>(
    () => ({ languageCode, languageConfig: getLanguageConfig(languageCode), setLanguageCode, ready }),
    [languageCode, ready]
  );

  return (
    <ActiveLanguageContext.Provider value={value}>
      {children}
    </ActiveLanguageContext.Provider>
  );
}

export function useActiveLanguage(): ActiveLanguageContextValue {
  const ctx = useContext(ActiveLanguageContext);
  if (!ctx) {
    throw new Error('useActiveLanguage() must be used within an <ActiveLanguageProvider>');
  }
  return ctx;
}
