import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { usePreferences } from '../lib/preferences';
import { ensureUserRow } from '../lib/users';

export default function LoginScreen() {
  const { colors } = usePreferences();
  const router = useRouter();
  // Settings' "Sign Up" button links here with ?mode=signup so it lands
  // directly on the create-account form instead of Sign In.
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleAuth = async () => {
    setError('');
    setInfo('');
    let userId: string | undefined;
    let userEmail: string | null = null;

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      if (!data.session) {
        // Email confirmation is required before Supabase issues a session -
        // signUp() doesn't error in this case, it just comes back without
        // one. Redirecting here would drop an unauthenticated user into
        // the app, so flash a message instead and stay on this screen.
        setInfo('Check your email to verify your account, then sign in.');
        setIsSignUp(false);
        return;
      }
      userId = data.user?.id;
      userEmail = data.user?.email ?? null;
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      userId = data.user?.id;
      userEmail = data.user?.email ?? null;
    }

    // Backstop for accounts created before the auto-provisioning trigger
    // existed (or if it's ever missing) - make sure public.users has a
    // row for this account before entering the app.
    if (userId) {
      await ensureUserRow(userId, userEmail);
    }

    router.replace('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Lingrazul</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>言語を学ぶ</Text>

      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        placeholder="Email"
        placeholderTextColor={colors.textFaint}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        placeholder="Password"
        placeholderTextColor={colors.textFaint}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {info ? <Text style={[styles.info, { color: colors.text }]}>{info}</Text> : null}

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={handleAuth}>
        <Text style={[styles.buttonText, { color: colors.accentText }]}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
        <Text style={[styles.toggle, { color: colors.textMuted }]}>
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 8,
  },
  sub: {
    fontSize: 18,
    marginBottom: 48,
  },
  input: {
    width: '100%',
    maxWidth: 360,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    width: '100%',
    maxWidth: 360,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggle: {
    marginTop: 24,
    fontSize: 14,
  },
  error: {
    marginBottom: 8,
    fontSize: 14,
  },
  info: {
    marginBottom: 8,
    fontSize: 14,
    maxWidth: 360,
    textAlign: 'center',
  },
});