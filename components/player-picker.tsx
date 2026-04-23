import { useEffect, useMemo, useState } from 'react';
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

// Unicode-Folding für Suche: Groß/klein, Diakritika und Sonder-Buchstaben,
// die NFD nicht zerlegt (Türkisch ı, Polnisch ł, Deutsch ß, Skandinavisch ø/æ usw.).
// Ohne das findet "Yildiz" den Spieler "K. Yıldız" nicht.
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/ł/g, 'l')
    .replace(/ø/g, 'o')
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/þ/g, 'th')
    .replace(/đ/g, 'd');
}

// Substring-Match auf foldeten Vollnamen — der "harte" Match. Findet
// "Yıldız" in "K. Yıldız", "Müller" in "T. Müller" etc.
function matchesSubstring(foldedName: string, foldedQuery: string): boolean {
  return foldedName.includes(foldedQuery);
}

// Multi-Token-Match mit Initial-Expansion. Greift wenn der User Vor- + Nachname
// tippt und api-football den Vornamen abgekürzt hat ("A. Güler" für "Arda
// Güler"). Jedes Query-Token muss ein Player-Token treffen — entweder via
// Substring oder weil das Player-Token ein Initial ist und das Query-Token
// mit diesem Buchstaben beginnt.
function matchesMultiToken(foldedName: string, qTokens: string[]): boolean {
  const pTokens = foldedName.split(/\s+/).filter(Boolean);
  return qTokens.every((qt) =>
    pTokens.some((pt) => {
      if (pt.includes(qt)) return true;
      const clean = pt.replace(/\./g, '');
      if (clean.length === 1 && qt.startsWith(clean)) return true;
      return false;
    }),
  );
}

// Single-Token-Initial-Match. Greift wenn der User einen einzelnen Vornamen
// tippt ("Kenan") und kein Spieler diesen Namen ausgeschrieben enthält —
// dann sind Spieler mit passender Vornamen-Initiale ("K. Yıldız") die einzige
// realistische Treffermenge. Wird vom sections-useMemo als FALLBACK verwendet,
// damit "Yildiz" nicht versehentlich Y.-Abkürzungen wie "Y. Meriah" matcht.
function matchesFirstNameInitial(foldedName: string, foldedQuery: string): boolean {
  const pTokens = foldedName.split(/\s+/).filter(Boolean);
  if (pTokens.length < 2) return false;
  const clean = pTokens[0].replace(/\./g, '');
  return clean.length === 1 && foldedQuery.startsWith(clean);
}

export function PlayerPicker({ visible, onClose, onSelect, groups, selectedId }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  const [query, setQuery] = useState('');
  // Manuell aufgeklappte Teams. Bei Suche ignoriert — dann werden alle Teams
  // mit Treffern automatisch aufgeklappt.
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // State zurücksetzen wenn der Modal zu geht — frischer Start beim nächsten Open.
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setExpanded(new Set());
    }
  }, [visible]);

  const hasQuery = query.trim().length > 0;

  const sections = useMemo(() => {
    // Ohne Suche: alle Team-Header zeigen, Spieler nur bei manuell aufgeklappten.
    if (!hasQuery) {
      return groups.map((g) => {
        const showPlayers = expanded.has(g.teamId);
        return {
          title: g.teamName,
          teamId: g.teamId,
          total: g.players.length,
          isExpanded: showPlayers,
          data: showPlayers ? g.players : [],
        };
      });
    }

    // Mit Suche: Strategie GLOBAL entscheiden, dann pro Team filtern.
    const q = fold(query).trim();
    const qTokens = q.split(/\s+/).filter(Boolean);

    let predicate: (foldedName: string) => boolean;

    if (qTokens.length >= 2) {
      // Multi-Token: Substring-Schnellpfad ODER all-tokens-match mit Initialen.
      predicate = (foldedName) =>
        matchesSubstring(foldedName, q) || matchesMultiToken(foldedName, qTokens);
    } else {
      // Single-Token: Substring zuerst probieren. Nur wenn GAR NIRGENDS ein
      // Substring-Treffer existiert, fallback auf Initial-Expansion (User
      // tippt vermutlich einen Vornamen → Spieler hat ihn als "K." abgekürzt).
      const hasAnySubstring = groups.some((g) =>
        g.players.some((p) => matchesSubstring(fold(p.name), q)),
      );
      if (hasAnySubstring) {
        predicate = (foldedName) => matchesSubstring(foldedName, q);
      } else {
        predicate = (foldedName) => matchesFirstNameInitial(foldedName, q);
      }
    }

    return groups
      .map((g) => {
        const matching = g.players.filter((p) => predicate(fold(p.name)));
        return {
          title: g.teamName,
          teamId: g.teamId,
          total: matching.length,
          isExpanded: true, // Suche klappt automatisch alle Treffer-Teams auf
          data: matching,
        };
      })
      .filter((s) => s.total > 0);
  }, [groups, query, expanded, hasQuery]);

  const pick = (p: PickerPlayer | null) => {
    onSelect(p);
    onClose();
  };

  const toggleTeam = (teamId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
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

        {!hasQuery ? (
          <ThemedText
            style={{
              color: c.textFaint,
              fontSize: FontSize.xs,
              textAlign: 'center',
              paddingHorizontal: Spacing.lg,
              marginBottom: Spacing.sm,
            }}>
            Mannschaft antippen, um Spieler zu sehen — oder oben suchen.
          </ThemedText>
        ) : null}

        <SectionList
          sections={sections}
          keyExtractor={(p) => String(p.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: Spacing.xxxl }}
          renderSectionHeader={({ section }) => (
            <Pressable
              onPress={() => !hasQuery && toggleTeam(section.teamId)}
              disabled={hasQuery}
              style={({ pressed }) => [
                styles.sectionHeader,
                {
                  backgroundColor: c.bg,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <ThemedText style={[styles.sectionHeaderText, { color: c.nostalgia }]}>
                {section.title}
              </ThemedText>
              <ThemedText style={{ color: c.textFaint, fontSize: FontSize.xs }}>
                {hasQuery
                  ? `${section.total} ${section.total === 1 ? 'Treffer' : 'Treffer'}`
                  : `${section.total} Spieler ${section.isExpanded ? '▾' : '▸'}`}
              </ThemedText>
            </Pressable>
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
              <ThemedText style={{ color: c.textMuted, textAlign: 'center' }}>
                {hasQuery
                  ? 'Kein Spieler passt zur Suche.'
                  : 'Keine Spieler in der DB.\nLauf `node scripts/import-squads.mjs` lokal.'}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
