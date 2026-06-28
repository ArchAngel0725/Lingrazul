import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setError('');
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lingrazul</Text>
      <Text style={styles.sub}>言語を学ぶ</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#555"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#555"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleAuth}>
        <Text style={styles.buttonText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
        <Text style={styles.toggle}>
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 4,
    marginBottom: 8,
  },
  sub: {
    fontSize: 18,
    color: '#888',
    marginBottom: 48,
  },
  input: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#0a0a0a',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggle: {
    color: '#888',
    marginTop: 24,
    fontSize: 14,
  },
  error: {
    color: '#ff4444',
    marginBottom: 8,
    fontSize: 14,
  },
});