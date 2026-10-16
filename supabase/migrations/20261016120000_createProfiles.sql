create table public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  username   text        not null check (username ~ '^[A-Z0-9_]{1,10}$'),
  created_at timestamptz not null default now()
);

create unique index profiles_username_key on public.profiles (username);

alter table public.profiles enable row level security;
create policy "profiles_select_public" on public.profiles
  for select to anon, authenticated using (true);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
-- sin políticas de update/delete: el username es inmutable
