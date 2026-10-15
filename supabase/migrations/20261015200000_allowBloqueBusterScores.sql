create or replace function public.submit_score(p_game_id text, p_player_name text, p_score integer)
returns table (improved boolean, best integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := upper(btrim(p_player_name));
  v_best integer;
begin
  -- ponytail: lista de juegos fija; ampliar con una migración al portar otro juego
  if p_game_id is null or p_game_id not in ('rocas', 'caida', 'bloque-buster') then
    raise exception 'invalid game';
  end if;
  if v_name is null or v_name !~ '^[A-Z0-9_ ]{1,10}$' then
    raise exception 'invalid name';
  end if;
  if p_score is null or p_score not between 1 and 10000000 then
    raise exception 'invalid score';
  end if;

  insert into public.scores as s (game_id, player_name, score)
  values (p_game_id, v_name, p_score)
  on conflict (game_id, player_name) do update
    set score = excluded.score, updated_at = now()
    where excluded.score > s.score
  returning s.score into v_best;

  if found then
    return query select true, v_best;
  else
    select s.score into v_best
      from public.scores s
      where s.game_id = p_game_id and s.player_name = v_name;
    return query select false, v_best;
  end if;
end;
$$;

revoke execute on function public.submit_score(text, text, integer) from public, anon, authenticated;
grant execute on function public.submit_score(text, text, integer) to anon, authenticated;
