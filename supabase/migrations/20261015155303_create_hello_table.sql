create table public.hello (
  id bigint generated always as identity primary key,
  name text not null
);

alter table public.hello enable row level security;

create policy "hello_public_read" on public.hello
  for select to anon, authenticated using (true);

insert into public.hello (name) values ('world');
