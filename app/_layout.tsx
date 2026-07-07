import { Stack } from 'expo-router';
import { PreferencesProvider } from '../lib/preferences';
import { ActiveLanguageProvider } from '../lib/activeLanguage';

export default function RootLayout() {
  return (
    <ActiveLanguageProvider>
      <PreferencesProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </PreferencesProvider>
    </ActiveLanguageProvider>
  );
}