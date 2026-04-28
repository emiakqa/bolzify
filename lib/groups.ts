// Lädt die Gruppen eines Turniers + ihre Teams aus teams.group_letter.
//
// Frühere Version derivierte Gruppen aus matches.stage — das funktionierte
// nicht, weil api-football für WM-Fixtures 'Group Stage - 1' (Spieltag) im
// round-Feld liefert, NICHT 'Group A'. Die echte Gruppen-Zuordnung kommt
// nur aus /standings. Wir speichern sie deshalb am Team selbst.

import { PickerTeam } from '@/components/team-picker';

import { supabase } from './supabase';

export type Group = {
  letter: string; // 'A' .. 'L'
  teams: PickerTeam[];
};

/**
 * Liefert sortierte Gruppenliste mit den Teams jeder Gruppe.
 *
 * Vor der Auslosung (oder bevor der Group-Seed gelaufen ist) sind alle
 * teams.group_letter NULL → leeres Array. Der Sondertipp-UI zeigt dann
 * den Empty-State.
 */
export async function getTournamentGroups(tournament: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, code, group_letter')
    .eq('tournament', tournament)
    .not('group_letter', 'is', null)
    .order('group_letter');

  if (error || !data) return [];

  const byLetter = new Map<string, PickerTeam[]>();
  for (const t of data) {
    const letter = t.group_letter;
    if (!letter) continue;
    const arr = byLetter.get(letter) ?? [];
    arr.push({ id: t.id, name: t.name, code: t.code });
    byLetter.set(letter, arr);
  }

  const groups: Group[] = Array.from(byLetter.entries()).map(([letter, teams]) => ({
    letter,
    teams,
  }));
  groups.sort((a, b) => a.letter.localeCompare(b.letter));
  return groups;
}
