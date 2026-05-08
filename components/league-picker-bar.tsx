// Bolzify — League-Picker-Bar
//
// Wiederverwendbare Pill ganz oben auf Tippen-/Home-/My-Tips-Screens, die die
// aktuell aktive Liga zeigt. Tap öffnet ein Modal mit allen Ligen des Users —
// Auswahl persistiert via lib/active-league.
//
// Wenn der User in genau 1 Liga ist, ist die Pill non-interactive (kein Sinn
// in einem Picker mit nur einer Option). In 0 Ligen rendert die Bar gar nicht
// — der jeweilige Screen muss seinen Empty-State zeigen.

import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Colors,
  Fonts,
  LetterSpacing,
  Radius,
  Spacing,
} from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type PickerLeague = {
  id: string;
  name: string;
  member_count: number;
};

type Props = {
  leagues: PickerLeague[];
  activeId: string | null;
  onSelect: (leagueId: string) => void;
};

export function LeaguePickerBar({ leagues, activeId, onSelect }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  const [open, setOpen] = useState(false);

  const active = useMemo(
    () => leagues.find((l) => l.id === activeId) ?? null,
    [leagues, activeId],
  );

  if (leagues.length === 0) return null;

  const isInteractive = leagues.length > 1;

  return (
    <>
      <Pressable
        onPress={isInteractive ? () => setOpen(true) : undefined}
        disabled={!isInteractive}
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: Fonts.mono.bold,
            fontSize: 10,
            letterSpacing: LetterSpacing.label,
            textTransform: 'uppercase',
          }}>
          Liga
        </Text>
        <Text
          style={{
            color: c.text,
            fontFamily: Fonts.display.bold,
            fontSize: 15,
            letterSpacing: -0.3,
            flex: 1,
          }}
          numberOfLines={1}>
          {active?.name ?? '—'}
        </Text>
        {isInteractive ? (
          <Text style={{ color: c.textMuted, fontSize: 16 }}>▾</Text>
        ) : null}
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        presentationStyle="pageSheet">
        <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
          <View style={styles.header}>
            <Text
              style={{
                color: c.text,
                fontFamily: Fonts.display.bold,
                fontSize: 22,
                letterSpacing: -0.5,
              }}>
              Liga wählen
            </Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}>
              <Text style={{ color: c.textMuted, fontFamily: Fonts.body.regular, fontSize: 14 }}>
                Abbrechen
              </Text>
            </Pressable>
          </View>
          <FlatList
            data={leagues}
            keyExtractor={(l) => l.id}
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl }}
            renderItem={({ item }) => {
              const isActive = item.id === activeId;
              return (
                <Pressable
                  onPress={() => {
                    onSelect(item.id);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: isActive ? c.accentSoft : c.surface,
                      borderColor: isActive ? c.accent : c.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}>
                  <View style={[styles.iconSquare, { backgroundColor: isActive ? c.accent : c.accentSoft }]}>
                    <Text
                      style={{
                        color: isActive ? c.accentFg : c.accent,
                        fontFamily: Fonts.display.bold,
                        fontSize: 14,
                      }}>
                      {item.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: Fonts.display.bold,
                        fontSize: 16,
                        letterSpacing: -0.3,
                      }}
                      numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: Fonts.mono.semibold,
                        fontSize: 11,
                        letterSpacing: 0.3,
                        marginTop: 2,
                        textTransform: 'uppercase',
                      }}>
                      {item.member_count} {item.member_count === 1 ? 'Mitglied' : 'Mitglieder'}
                    </Text>
                  </View>
                  {isActive ? (
                    <Text
                      style={{ color: c.accent, fontFamily: Fonts.display.bold, fontSize: 18 }}>
                      ✓
                    </Text>
                  ) : null}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  iconSquare: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
