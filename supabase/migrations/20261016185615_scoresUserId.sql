alter table public.scores add column id uuid not null default gen_random_uuid();
alter table public.scores add column user_id uuid references auth.users (id) on delete set null;
alter table public.scores drop constraint scores_pkey;
alter table public.scores add primary key (id);

-- un registro por jugador y juego, para registrados y para legado
create unique index scores_user_game_key   on public.scores (game_id, user_id)     where user_id is not null;
create unique index scores_legacy_name_key on public.scores (game_id, player_name) where user_id is null;
