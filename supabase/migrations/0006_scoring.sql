-- Bolzify Scoring-Engine.
--
-- Punkte-System (aus MVP-Scope):
--   - 6  Punkte exaktes Ergebnis  (e.g. tip 2:1, real 2:1)
--   - 4  Punkte richtige Tordifferenz NICHT exakt (e.g. tip 3:2, real 2:1)
--   - 2  Punkte richtige Tendenz 1/X/2 (e.g. tip 1:0, real 3:0)
--   - 0  sonst
--   - +3 Bonus wenn first_scorer_id getippt UND im Match getroffen
--
-- Höhere Stufen überschreiben niedrigere (kein Kumulieren).
-- total_points ist eine generated column auf scored_tips (points + scorer_bonus).

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
    select id, user_id, home_goals, away_goals, first_scorer_id
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

    insert into scored_tips (tip_id, user_id, match_id, points, scorer_bonus)
    values (v_tip.id, v_tip.user_id, p_match_id, v_points, v_bonus)
    on conflict (tip_id) do update
      set points = excluded.points,
          scorer_bonus = excluded.scorer_bonus,
          scored_at = now();

    v_scored_count := v_scored_count + 1;
  end loop;

  return v_scored_count;
end;
$$;

grant execute on function public.score_match(bigint) to authenticated, service_role;

-- Auto-Trigger: wenn Match zu 'finished' transitions, Scoring ausführen.
create or replace function public.trigger_score_on_finish()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'finished'
     and (old.status is distinct from 'finished' or old.home_goals is distinct from new.home_goals or old.away_goals is distinct from new.away_goals or old.first_scorer_id is distinct from new.first_scorer_id)
     and new.home_goals is not null
     and new.away_goals is not null
  then
    perform public.score_match(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists matches_auto_score on public.matches;
create trigger matches_auto_score
  after update on public.matches
  for each row
  execute function public.trigger_score_on_finish();

-- scored_tips sollte unique per tip_id sein (für onConflict).
alter table public.scored_tips
  drop constraint if exists scored_tips_tip_id_key;
alter table public.scored_tips
  add constraint scored_tips_tip_id_key unique (tip_id);
