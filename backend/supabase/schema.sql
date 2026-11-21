-- Codecontenu : à exécuter dans Supabase > SQL Editor.
create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
grant select on public.admins to authenticated;
alter table public.admins enable row level security;
create policy "self read" on public.admins for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;
grant execute on function public.is_admin() to authenticated, anon;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('fichier','formation','coaching','service')),
  name text not null, slug text not null unique,
  short_description text not null default '', description text not null default '',
  price integer not null check (price >= 0), compare_price integer,
  cover_url text not null default '', category text not null default '',
  benefits text[] not null default '{}', published boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
alter table public.products enable row level security;
create policy "public published" on public.products for select using (published or public.is_admin());
create policy "admin write" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.product_private (
  product_id uuid primary key references public.products(id) on delete cascade,
  content_url text not null default '', delivery_message text not null default ''
);
grant select, insert, update, delete on public.product_private to authenticated;
alter table public.product_private enable row level security;
create policy "admin only" on public.product_private for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null, amount integer not null,
  customer_name text not null check (length(customer_name) between 2 and 100),
  customer_phone text not null check (length(customer_phone) between 8 and 30),
  txn_ref text not null default '' check (length(txn_ref) <= 100),
  status text not null default 'en_attente' check (status in ('en_attente','verifie','refuse')),
  created_at timestamptz not null default now()
);
grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;
alter table public.orders enable row level security;
create policy "anyone can order" on public.orders for insert with check (status = 'en_attente');
create policy "admin read" on public.orders for select to authenticated using (public.is_admin());
create policy "admin update" on public.orders for update to authenticated using (public.is_admin());

-- Stockage : couvertures publiques, contenus privés
insert into storage.buckets (id, name, public) values ('covers','covers',true), ('contents','contents',false);
create policy "covers read" on storage.objects for select using (bucket_id = 'covers');
create policy "admin upload" on storage.objects for insert to authenticated with check (bucket_id in ('covers','contents') and public.is_admin());
create policy "admin read contents" on storage.objects for select to authenticated using (bucket_id = 'contents' and public.is_admin());

-- Après avoir créé votre compte (Authentication > Users > Add user), rendez-le admin :
-- insert into public.admins (user_id) values ('<votre-user-id>');
