-- Bolzify — Sondertipps-Scoring (Teil B: Engine-Function)
-- Voraussetzung: 0009a wurde ausgeführt.
--
-- score_special_tips(p_tournament): durchläuft alle special_tips eines
-- Turniers, ermittelt Champion/Runner-up aus dem Final-Match, Halbfinalisten
-- aus den Semi-finals-Matches, Top-Scorer aus players.tournament_goals und
-- UPSERTed scored_special_tips. Idempotent — kann beliebig oft laufen.

create or replace function public.score_special_tips(p_tournament text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_champion_team_id   int;
  v_runner_up_team_id  int;
  v_hf_teams           int[];
  v_top_scorer_id      bigint;
  v_tip                record;
  v_champion_pts       int;
  v_runner_up_pts      int;
  v_hf_hits            int;
  v_hf_pts             int;
  v_top_scorer_pts     int;
  v_count              int := 0;
begin
  -- Champion + Runner-up aus Final ableiten. winner_team_id hat Vorrang
  -- (nötig wenn Final ins Elfmeterschießen ging — home_goals == away_goals).
  select
    coalesce(
      m.winner_team_id,
      case
        when m.home_goals > m.away_goals then m.home_team_id
        when m.away_goals > m.home_goals then m.away_team_id
        else null
      end
    ),
    case
      when m.winner_team_id is not null then
        case when m.winner_team_id = m.home_team_id then m.away_team_id else m.home_team_id end
      when m.home_goals > m.away_goals then m.away_team_id
      when m.away_goals > m.home_goals then m.home_team_id
      else null
    end
  into v_champion_team_id, v_runner_up_team_id
  from public.matches m
  where m.tournament = p_tournament
    and m.stage = 'Final'
    and m.status = 'finished'
    and m.home_goals is not null
    and m.away_goals is not null
  order by m.kickoff_at desc
  limit 1;

  -- Halbfinalisten als Set: alle 4 Teams aus finished Semi-finals-Matches.
  select coalesce(array_agg(distinct t), array[]::int[])
  into v_hf_teams
  from (
    select home_team_id as t from public.matches
    where tournament = p_tournament and stage = 'Semi-finals' and status = 'finished'
    union all
    select away_team_id from public.matches
    where tournament = p_tournament and stage = 'Semi-finals' and status = 'finished'
  ) s
  where t is not null;

  -- Top-Scorer: höchstes tournament_goals. Bei Gleichstand → niedrigste id
  -- (deterministisch). 0 Tore → niemand kriegt Punkte.
  select p.id
  into v_top_scorer_id
  from public.players p
  where p.tournament_goals > 0
  order by p.tournament_goals desc, p.id asc
  limit 1;

  -- Pro User scoren
  for v_tip in
    select user_id,
           champion_team_id,
           runner_up_team_id,
           semifinalist_a_team_id,
           semifinalist_b_team_id,
           top_scorer_player_id
    from public.special_tips
    where tournament = p_tournament
  loop
    v_champion_pts := case
      when v_champion_team_id is not null
       and v_tip.champion_team_id = v_champion_team_id then 10 else 0
    end;

    v_runner_up_pts := case
      when v_runner_up_team_id is not null
       and v_tip.runner_up_team_id = v_runner_up_team_id then 5 else 0
    end;

    -- Set-Treffer: jedes getippte HF-Team zählt 1× — egal welches Slot.
    v_hf_hits := (
      select count(distinct t)
      from unnest(array[
        v_tip.champion_team_id,
        v_tip.runner_up_team_id,
        v_tip.semifinalist_a_team_id,
        v_tip.semifinalist_b_team_id
      ]) as t
      where t is not null and t = any(v_hf_teams)
    );
    v_hf_pts := v_hf_hits * 5;

    v_top_scorer_pts := case
      when v_top_scorer_id is not null
       and v_tip.top_scorer_player_id = v_top_scorer_id then 5 else 0
    end;

    insert into public.scored_special_tips (
      user_id, tournament,
      champion_points, runner_up_points,
      semifinalist_hits, semifinalist_points,
      top_scorer_points
    ) values (
      v_tip.user_id, p_tournament,
      v_champion_pts, v_runner_up_pts,
      v_hf_hits, v_hf_pts,
      v_top_scorer_pts
    )
    on conflict (user_id, tournament) do update
      set champion_points     = excluded.champion_points,
          runner_up_points    = excluded.runner_up_points,
          semifinalist_hits   = excluded.semifinalist_hits,
          semifinalist_points = excluded.semifinalist_points,
          top_scorer_points   = excluded.top_scorer_points,
          scored_at           = now();

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.score_special_tips(text) to authenticated, service_role;
