// Bolzify — useActiveLeague Hook
//
// Lädt die Ligen des Users + den persistierten "aktiven Liga"-Pointer
// aus AsyncStorage. Validiert die Pointer-ID gegen die Liga-Liste —
// wenn der User die Liga verlassen hat oder sie gelöscht wurde, fällt der
// Hook auf die erste verfügbare Liga zurück.
//
// Subscribed auf den Pub/Sub aus lib/active-league: wenn ein Screen die
// Liga via setActive umstellt, kriegen alle anderen Screens das mit ohne
// Reload.
//
// Reload-Trigger:
//   - useFocusEffect: bei jeder Tab-/Screen-Rückkehr (User könnte zwischendurch
//     beigetreten/gegangen sein)
//   - subscribeActiveLeague: bei lokalem Wechsel
//
// Nicht in jedem Screen mounten — der Auth-Pfad oben (AuthGate) sorgt dafür,
// dass der User in jedem Tab eingeloggt ist. Hook funktioniert nur wenn user
// gesetzt ist.

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import {
  pickActiveLeagueId,
  setActiveLeagueId,
  subscribeActiveLeague,
} from '@/lib/active-league';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export type UserLeague = {
  id: string;
  name: string;
  member_count: number;
};

type State = {
  leagues: UserLeague[];
  activeLeagueId: string | null;
  loading: boolean;
};

export function useActiveLeague() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<State>({
    leagues: [],
    activeLeagueId: null,
    loading: true,
  });

  const reload = useCallback(async () => {
    if (!userId) {
      setState({ leagues: [], activeLeagueId: null, loading: false });
      return;
    }
    // 1. Liga-Mitgliedschaften des Users
    const { data: memberRows } = await supabase
      .from('league_members')
      .select('league_id')
      .eq('user_id', userId);
    const leagueIds = (memberRows ?? []).map((r) => r.league_id);

    if (leagueIds.length === 0) {
      await setActiveLeagueId(null);
      setState({ leagues: [], activeLeagueId: null, loading: false });
      return;
    }

    // 2. Liga-Metadaten + Member-Counts in zwei Queries
    const [{ data: leagueRows }, { data: counts }] = await Promise.all([
      supabase
        .from('leagues')
        .select('id, name, created_at')
        .in('id', leagueIds)
        .order('created_at', { ascending: false }),
      supabase.from('league_members').select('league_id').in('league_id', leagueIds),
    ]);
    const countMap = new Map<string, number>();
    for (const row of counts ?? [])
      countMap.set(row.league_id, (countMap.get(row.league_id) ?? 0) + 1);

    const leagues: UserLeague[] = (leagueRows ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      member_count: countMap.get(l.id) ?? 1,
    }));

    // 3. Aktive Liga validieren / setzen
    const activeLeagueId = await pickActiveLeagueId(leagues.map((l) => l.id));

    setState({ leagues, activeLeagueId, loading: false });
  }, [userId]);

  // Initial load
  useEffect(() => {
    reload();
  }, [reload]);

  // Re-load bei Tab-Wechsel (User könnte beigetreten / verlassen haben)
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  // Pub/Sub: anderer Screen wechselt die aktive Liga → State sync
  useEffect(() => {
    return subscribeActiveLeague((leagueId) => {
      setState((s) => ({ ...s, activeLeagueId: leagueId }));
    });
  }, []);

  const setActive = useCallback(async (leagueId: string) => {
    await setActiveLeagueId(leagueId);
    // setState passiert automatisch via subscribe-Listener oben.
  }, []);

  return {
    leagues: state.leagues,
    activeLeagueId: state.activeLeagueId,
    setActive,
    loading: state.loading,
    reload,
  };
}
