import { Stack } from 'expo-router';
import { PreferencesProvider } from '../lib/preferences';

export default function RootLayout() {
  return (
    <PreferencesProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PreferencesProvider>
  );
}