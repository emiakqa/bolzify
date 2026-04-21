import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { markOnboardingSeen } from '@/lib/onboarding';

const { width: SCREEN_W } = Dimensions.get('window');

const slides = [
  {
    emoji: '⚽',
    title: 'Tippe jedes Spiel',
    body: 'Vor dem Anpfiff setzt du Ergebnis + optional den ersten Torschützen. Danach ist der Tipp gesperrt.',
  },
  {
    emoji: '🎯',
    title: 'Sammle Punkte',
    body: 'Genauer Endstand = 6 Punkte · nur Tordifferenz = 4 · nur Tendenz = 2. Richtiger Torschütze gibt +3 Bonus.',
  },
  {
    emoji: '🏆',
    title: 'Spiel gegen Freunde',
    body: 'Leg eine Liga an, teile den Code per WhatsApp, und das Ranking läuft automatisch. So oft du willst, kostenlos.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  const scrollRef = useRef<ScrollView>(null);
  const [idx, setIdx] = useState(0);

  const finish = async () => {
    await markOnboardingSeen();
    router.replace('/');
  };

  const next = () => {
    if (idx < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: (idx + 1) * SCREEN_W, animated: true });
    } else {
      finish();
    }
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setIdx(i);
  };

  const isLast = idx === slides.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <View style={styles.skipRow}>
        <Pressable onPress={finish} hitSlop={12}>
          <ThemedText style={{ color: c.textMuted, fontSize: FontSize.sm }}>
            Überspringen
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={{ flex: 1 }}>
        {slides.map((s, i) => (
          <View key={i} style={styles.slide}>
            <ThemedText style={styles.emoji}>{s.emoji}</ThemedText>
            <ThemedText style={[styles.title, { color: c.text }]}>{s.title}</ThemedText>
            <ThemedText style={[styles.body, { color: c.textMuted }]}>{s.body}</ThemedText>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === idx ? c.accent : c.border,
                width: i === idx ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      <Pressable
        onPress={next}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 },
        ]}>
        <ThemedText
          style={{ color: c.accentFg, fontSize: FontSize.md, fontWeight: FontWeight.semibold }}>
          {isLast ? 'Los geht\'s' : 'Weiter'}
        </ThemedText>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  skipRow: { alignItems: 'flex-end', padding: Spacing.lg },
  slide: {
    width: SCREEN_W,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  emoji: { fontSize: 88, textAlign: 'center', marginBottom: Spacing.xl },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  body: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: Spacing.xl,
  },
  dot: { height: 8, borderRadius: 4 },
  cta: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
});
