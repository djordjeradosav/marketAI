import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { C, S, R } from '../../src/config/theme'

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.sub}>
          Optional screen. If you don’t need it, delete `app/(tabs)/explore.tsx` and keep it out of
          `app/(tabs)/_layout.tsx`.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick links</Text>
          <Text style={styles.cardText}>- Seasonality: `/seasonality`</Text>
          <Text style={styles.cardText}>- Calendar: `/calendar`</Text>
          <Text style={styles.cardText}>- COT: `/cot`</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: S.lg, paddingBottom: 120 },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { marginTop: 6, fontSize: 12, lineHeight: 18, color: C.muted },
  card: {
    marginTop: S.lg,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.md,
    borderWidth: 0.5,
    borderColor: C.border,
    gap: 6,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.text },
  cardText: { fontSize: 12, color: C.muted },
})
