-- Bolzify — Sondertipp-Scoring v2 (nutzt teams.group_letter statt stage-Regex)
-- Voraussetzung: 0012a wurde ausgeführt.
--
-- Ersetzt die Function aus 0010c. Der einzige fachliche Unterschied: die
-- Gruppensieger-Berechnung joint matches mit teams (auf group_letter), statt
-- stage-Werte zu parsen. Champion/Runner-up/HF/Top-Scorer-Logik ist 1:1
-- übernommen.

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
  v_group_winners      jsonb;
  v_tip                record;
  v_champion_pts       int;
  v_runner_up_pts      int;
  v_hf_hits            int;
  v_hf_pts             int;
  v_top_scorer_pts     int;
  v_gw_hits            int;
  v_gw_pts             int;
  v_count              int := 0;
begin
  -- Champion + Runner-up aus Final
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

  -- Halbfinalisten als Set
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

  -- Top-Scorer
  select p.id into v_top_scorer_id
  from public.players p
  where p.tournament_goals > 0
  order by p.tournament_goals desc, p.id asc
  limit 1;

  -- Gruppensieger pro Gruppe — beide Teams müssen dasselbe group_letter haben.
  -- Eine Gruppe gilt als "fertig" wenn 6 Spiele finished (4 Teams × 3 / 2).
  -- Tie-Breaker: Punkte → Tordifferenz → erzielte Tore → team_id.
  with group_matches as (
    select
      th.group_letter as grp,
      m.home_team_id, m.away_team_id, m.home_goals, m.away_goals
    from public.matches m
    join public.teams th on th.id = m.home_team_id
    join public.teams ta on ta.id = m.away_team_id
    where m.tournament = p_tournament
      and th.tournament = p_tournament
      and ta.tournament = p_tournament
      and th.group_letter is not null
      and ta.group_letter = th.group_letter
      and m.status = 'finished'
      and m.home_goals is not null
      and m.away_goals is not null
  ),
  per_team as (
    select grp, home_team_id as team_id,
           case when home_goals > away_goals then 3
                when home_goals = away_goals then 1 else 0 end as pts,
           home_goals - away_goals as gd,
           home_goals as gf
    from group_matches
    union all
    select grp, away_team_id,
           case when away_goals > home_goals then 3
                when away_goals = home_goals then 1 else 0 end,
           away_goals - home_goals,
           away_goals
    from group_matches
  ),
  totals as (
    select grp, team_id, sum(pts)::int as pts, sum(gd)::int as gd, sum(gf)::int as gf
    from per_team
    where team_id is not null
    group by grp, team_id
  ),
  finished_groups as (
    select grp from group_matches group by grp having count(*) = 6
  ),
  winners as (
    select distinct on (t.grp) t.grp, t.team_id
    from totals t
    join finished_groups f on f.grp = t.grp
    order by t.grp, t.pts desc, t.gd desc, t.gf desc, t.team_id asc
  )
  select coalesce(jsonb_object_agg(grp, team_id), '{}'::jsonb)
  into v_group_winners
  from winners;

  -- Pro User scoren
  for v_tip in
    select user_id,
           champion_team_id, runner_up_team_id,
           semifinalist_a_team_id, semifinalist_b_team_id,
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
    v_hf_hits := (
      select count(distinct t)
      from unnest(array[
        v_tip.champion_team_id, v_tip.runner_up_team_id,
        v_tip.semifinalist_a_team_id, v_tip.semifinalist_b_team_id
      ]) as t
      where t is not null and t = any(v_hf_teams)
    );
    v_hf_pts := v_hf_hits * 5;
    v_top_scorer_pts := case
      when v_top_scorer_id is not null
       and v_tip.top_scorer_player_id = v_top_scorer_id then 5 else 0
    end;

    select count(*)::int into v_gw_hits
    from public.group_winner_tips g
    where g.user_id = v_tip.user_id
      and g.tournament = p_tournament
      and (v_group_winners ->> g.group_letter)::int = g.team_id;
    v_gw_pts := v_gw_hits * 3;

    insert into public.scored_special_tips (
      user_id, tournament,
      champion_points, runner_up_points,
      semifinalist_hits, semifinalist_points,
      top_scorer_points,
      group_winner_hits, group_winner_points
    ) values (
      v_tip.user_id, p_tournament,
      v_champion_pts, v_runner_up_pts,
      v_hf_hits, v_hf_pts,
      v_top_scorer_pts,
      v_gw_hits, v_gw_pts
    )
    on conflict (user_id, tournament) do update
      set champion_points     = excluded.champion_points,
          runner_up_points    = excluded.runner_up_points,
          semifinalist_hits   = excluded.semifinalist_hits,
          semifinalist_points = excluded.semifinalist_points,
          top_scorer_points   = excluded.top_scorer_points,
          group_winner_hits   = excluded.group_winner_hits,
          group_winner_points = excluded.group_winner_points,
          scored_at           = now();
    v_count := v_count + 1;
  end loop;

  -- Edge-Case: User mit nur group_winner_tips (keine special_tips-Row)
  for v_tip in
    select distinct g.user_id
    from public.group_winner_tips g
    where g.tournament = p_tournament
      and not exists (
        select 1 from public.special_tips s
        where s.user_id = g.user_id and s.tournament = p_tournament
      )
  loop
    select count(*)::int into v_gw_hits
    from public.group_winner_tips g
    where g.user_id = v_tip.user_id
      and g.tournament = p_tournament
      and (v_group_winners ->> g.group_letter)::int = g.team_id;
    v_gw_pts := v_gw_hits * 3;

    insert into public.scored_special_tips (
      user_id, tournament,
      group_winner_hits, group_winner_points
    ) values (v_tip.user_id, p_tournament, v_gw_hits, v_gw_pts)
    on conflict (user_id, tournament) do update
      set group_winner_hits = excluded.group_winner_hits,
          group_winner_points = excluded.group_winner_points,
          scored_at = now();
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.score_special_tips(text) to authenticated, service_role;

-- Trigger vereinfachen: jeder finished match triggert Re-Scoring. Function
-- ist idempotent, kostet nur etwas CPU. Ersetzt Function aus 0010c.
create or replace function public.trigger_score_special_tips_on_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'finished'
     and (
       old.status is distinct from 'finished'
       or old.home_goals is distinct from new.home_goals
       or old.away_goals is distinct from new.away_goals
       or old.winner_team_id is distinct from new.winner_team_id
     )
  then
    perform public.score_special_tips(new.tournament);
  end if;
  return new;
end;
$$;
