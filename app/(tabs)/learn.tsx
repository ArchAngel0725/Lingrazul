import { View, Text, StyleSheet } from 'react-native';

export default function LearnScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Learn</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#ffffff', fontSize: 24 },
});