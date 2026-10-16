drop function public.submit_score(text, text, integer);

create function public.submit_score(p_game_id text, p_score integer)
returns table (improved boolean, best integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_best integer;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  -- ponytail: lista de juegos fija; ampliar con una migración al portar otro juego
  if p_game_id is null or p_game_id not in ('rocas', 'caida', 'bloque-buster', 'serpentina', 'salto-neon', 'frogger') then
    raise exception 'invalid game';
  end if;
  if p_score is null or p_score not between 1 and 10000000 then
    raise exception 'invalid score';
  end if;

  select p.username into v_name from public.profiles p where p.id = v_uid;
  if v_name is null then
    raise exception 'no profile';
  end if;

  insert into public.scores as s (game_id, user_id, player_name, score)
  values (p_game_id, v_uid, v_name, p_score)
  on conflict (game_id, user_id) where user_id is not null do update
    set score = excluded.score, updated_at = now()
    where excluded.score > s.score
  returning s.score into v_best;

  if found then
    return query select true, v_best;
  else
    select s.score into v_best
      from public.scores s
      where s.game_id = p_game_id and s.user_id = v_uid;
    return query select false, v_best;
  end if;
end;
$$;

revoke execute on function public.submit_score(text, integer) from public, anon;
grant execute on function public.submit_score(text, integer) to authenticated;
