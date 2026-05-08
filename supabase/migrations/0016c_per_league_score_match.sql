-- Bolzify — Per-Liga-Tipps (Phase 3a: score_match überschreiben)
-- Voraussetzung: 0016a + 0016b + 0016b2 wurden ausgeführt.
--
-- Identisch zu 0006_scoring.sql, nur mit league_id-Propagation: Jeder Tipp
-- wird einzeln gescored, scored_tips bekommt die league_id aus tips dazu
-- (denormalisiert, damit Liga-Leaderboards ohne join filtern können).

create or replace function public.score_match(p_match_id bigint)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match matches%rowtype;
  v_tip record;
  v_points integer;
  v_bonus integer;
  v_diff_real integer;
  v_diff_tip integer;
  v_sign_real integer;
  v_sign_tip integer;
  v_scored_count integer := 0;
begin
  select * into v_match from matches where id = p_match_id;
  if v_match.id is null then
    raise exception 'match % nicht gefunden', p_match_id;
  end if;
  if v_match.home_goals is null or v_match.away_goals is null then
    raise exception 'match % hat kein Ergebnis', p_match_id;
  end if;

  v_diff_real := v_match.home_goals - v_match.away_goals;
  v_sign_real := sign(v_diff_real);

  for v_tip in
    select id, user_id, league_id, home_goals, away_goals, first_scorer_id
    from tips
    where match_id = p_match_id
  loop
    v_diff_tip := v_tip.home_goals - v_tip.away_goals;
    v_sign_tip := sign(v_diff_tip);

    if v_tip.home_goals = v_match.home_goals and v_tip.away_goals = v_match.away_goals then
      v_points := 6;
    elsif v_diff_tip = v_diff_real then
      v_points := 4;
    elsif v_sign_tip = v_sign_real then
      v_points := 2;
    else
      v_points := 0;
    end if;

    v_bonus := 0;
    if v_tip.first_scorer_id is not null
       and v_match.first_scorer_id is not null
       and v_tip.first_scorer_id = v_match.first_scorer_id
    then
      v_bonus := 3;
    end if;

    insert into scored_tips (tip_id, user_id, league_id, match_id, points, scorer_bonus)
    values (v_tip.id, v_tip.user_id, v_tip.league_id, p_match_id, v_points, v_bonus)
    on conflict (tip_id) do update
      set league_id    = excluded.league_id,
          points       = excluded.points,
          scorer_bonus = excluded.scorer_bonus,
          scored_at    = now();

    v_scored_count := v_scored_count + 1;
  end loop;

  return v_scored_count;
end;
$$;
