import { View, Text, StyleSheet } from 'react-native';
import { usePreferences } from '../../lib/preferences';

export default function LearnScreen() {
  const { colors } = usePreferences();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>Learn</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 24 },
});
