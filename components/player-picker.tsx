import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type PickerPlayer = {
  id: number;
  name: string;
  number: number | null;
  position: string | null;
};

export type PickerGroup = {
  teamId: number;
  teamName: string;
  players: PickerPlayer[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (player: PickerPlayer | null) => void;
  groups: PickerGroup[];
  selectedId: number | null;
};

export function PlayerPicker({ visible, onClose, onSelect, groups, selectedId }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.map((g) => ({
      title: g.teamName,
      teamId: g.teamId,
      data: q ? g.players.filter((p) => p.name.toLowerCase().includes(q)) : g.players,
    }));
  }, [groups, query]);

  const pick = (p: PickerPlayer | null) => {
    onSelect(p);
    onClose();
    setQuery('');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.header}>
          <ThemedText style={[styles.title, { color: c.text }]}>Torschütze</ThemedText>
          <Pressable onPress={onClose} hitSlop={12}>
            <ThemedText style={{ color: c.textMuted, fontSize: FontSize.md }}>Fertig</ThemedText>
          </Pressable>
        </View>

        <View style={[styles.searchWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TextInput
            style={[styles.search, { color: c.text }]}
            placeholder="Spieler suchen…"
            placeholderTextColor={c.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <ThemedText style={{ color: c.textMuted }}>✕</ThemedText>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => pick(null)}
          style={({ pressed }) => [
            styles.noneRow,
            { borderColor: c.border, opacity: pressed ? 0.7 : 1 },
          ]}>
          <ThemedText style={{ color: c.textMuted, fontSize: FontSize.md }}>
            Kein Torschütze / Tipp entfernen
          </ThemedText>
          {selectedId === null ? (
            <ThemedText style={{ color: c.accent, fontSize: FontSize.md }}>✓</ThemedText>
          ) : null}
        </Pressable>

        <SectionList
          sections={sections}
          keyExtractor={(p) => String(p.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: Spacing.xxxl }}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: c.bg }]}>
              <ThemedText style={[styles.sectionHeaderText, { color: c.nostalgia }]}>
                {section.title}
              </ThemedText>
            </View>
          )}
          renderItem={({ item }) => {
            const active = item.id === selectedId;
            return (
              <Pressable
                onPress={() => pick(item)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: active ? c.surfaceElevated : c.surface,
                    borderColor: active ? c.accent : c.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <View style={styles.rowLeft}>
                  <View style={[styles.numberBadge, { borderColor: c.border }]}>
                    <ThemedText style={{ color: c.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.semibold }}>
                      {item.number ?? '–'}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ color: c.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold }}>
                      {item.name}
                    </ThemedText>
                    {item.position ? (
                      <ThemedText style={{ color: c.textFaint, fontSize: FontSize.xs }}>
                        {item.position}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
                {active ? (
                  <ThemedText style={{ color: c.accent, fontSize: FontSize.md }}>✓</ThemedText>
                ) : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <ThemedText style={{ color: c.textMuted }}>
                Keine Spieler in der DB.{'\n'}Lauf `node scripts/import-squads.mjs` lokal.
              </ThemedText>
            </View>
          }
          stickySectionHeadersEnabled
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  search: { flex: 1, paddingVertical: Spacing.md, fontSize: FontSize.md },
  noneRow: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  sectionHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  row: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  numberBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
