import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deName } from '@/lib/country-names';

export type PickerTeam = {
  id: number;
  name: string; // Englischer Original-Name aus DB — wird beim Rendern übersetzt
  code: string | null;
};

type Props = {
  visible: boolean;
  title: string;
  teams: PickerTeam[];
  selectedId: number | null;
  // IDs, die nicht (erneut) wählbar sind — damit derselbe Verein nicht z.B.
  // gleichzeitig als Weltmeister UND Halbfinalist steht.
  disabledIds?: readonly number[];
  onClose: () => void;
  onSelect: (team: PickerTeam | null) => void;
};

export function TeamPicker({
  visible,
  title,
  teams,
  selectedId,
  disabledIds = [],
  onClose,
  onSelect,
}: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  const [query, setQuery] = useState('');

  const disabledSet = useMemo(() => new Set(disabledIds), [disabledIds]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Nach deutschem Namen sortieren, damit User-facing Reihenfolge passt.
    const withDe = teams.map((t) => ({ ...t, display: deName(t.name) }));
    const filtered = q
      ? withDe.filter(
          (t) =>
            t.display.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q) ||
            (t.code?.toLowerCase() ?? '').includes(q),
        )
      : withDe;
    return filtered.sort((a, b) => a.display.localeCompare(b.display, 'de'));
  }, [teams, query]);

  const pick = (t: PickerTeam | null) => {
    onSelect(t);
    onClose();
    setQuery('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet">
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.header}>
          <ThemedText style={[styles.title, { color: c.text }]}>{title}</ThemedText>
          <Pressable onPress={onClose} hitSlop={12}>
            <ThemedText style={{ color: c.textMuted, fontSize: FontSize.md }}>Fertig</ThemedText>
          </Pressable>
        </View>

        <View style={[styles.searchWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TextInput
            style={[styles.search, { color: c.text }]}
            placeholder="Team suchen…"
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
            Keine Auswahl / Tipp entfernen
          </ThemedText>
          {selectedId === null ? (
            <ThemedText style={{ color: c.accent, fontSize: FontSize.md }}>✓</ThemedText>
          ) : null}
        </Pressable>

        <FlatList
          data={rows}
          keyExtractor={(t) => String(t.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: Spacing.xxxl }}
          renderItem={({ item }) => {
            const active = item.id === selectedId;
            const disabled = disabledSet.has(item.id) && !active;
            return (
              <Pressable
                onPress={() => (disabled ? null : pick(item))}
                disabled={disabled}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: active ? c.surfaceElevated : c.surface,
                    borderColor: active ? c.accent : c.border,
                    opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
                  },
                ]}>
                <View style={styles.rowLeft}>
                  <View style={[styles.codeBadge, { borderColor: c.border }]}>
                    <ThemedText
                      style={{
                        color: c.textMuted,
                        fontSize: FontSize.xs,
                        fontWeight: FontWeight.semibold,
                      }}>
                      {item.code ?? '—'}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText
                      style={{
                        color: c.text,
                        fontSize: FontSize.md,
                        fontWeight: FontWeight.semibold,
                      }}>
                      {item.display}
                    </ThemedText>
                    {disabled ? (
                      <ThemedText style={{ color: c.textFaint, fontSize: FontSize.xs }}>
                        Bereits ausgewählt
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
              <ThemedText style={{ color: c.textMuted, textAlign: 'center' }}>
                Keine Teams in der DB.{'\n'}Lauf `node scripts/import-fixtures.mjs` lokal.
              </ThemedText>
            </View>
          }
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
  codeBadge: {
    width: 44,
    height: 32,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
