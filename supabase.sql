create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('work', 'skills', 'tools')),
  title text not null check (char_length(title) between 1 and 100),
  image_url text not null,
  project_url text,
  description text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);


alter table public.portfolio_items enable row level security;
alter table public.portfolio_admins enable row level security;

create policy "Public can read portfolio items" on public.portfolio_items for select using (true);


create policy "Admins manage portfolio items" on public.portfolio_items for all to authenticated
  using (exists (select 1 from public.portfolio_admins where user_id = auth.uid()))
  with check (exists (select 1 from public.portfolio_admins where user_id = auth.uid()));

