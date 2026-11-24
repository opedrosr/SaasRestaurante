-- STACK BURGER: schema multi-tenant com RLS
create extension if not exists "pgcrypto";

create table restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  tagline text, description text, address text,
  logo_url text, hero_url text,
  whatsapp text, instagram text,
  opening_hours jsonb default '{}',
  brand_colors jsonb default '{}',
  is_published boolean not null default false,
  created_at timestamptz default now()
);

create table restaurant_members (
  restaurant_id uuid references restaurants on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null default 'owner' check (role in ('owner','editor')),
  primary key (restaurant_id, user_id)
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants on delete cascade,
  name text not null, sort_order int not null default 0,
  is_active boolean not null default true
);

create table products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants on delete cascade,
  category_id uuid references categories on delete set null,
  name text not null, description text,
  price_cents int not null check (price_cents >= 0),
  ingredients text[] default '{}',
  weight_g int,
  is_available boolean not null default true,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create table product_photos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products on delete cascade,
  restaurant_id uuid not null references restaurants on delete cascade,
  storage_path text not null, is_primary boolean default false, sort_order int default 0
);

-- Dimensões do ALIMENTO e da EMBALAGEM ficam separadas (kind), em centímetros.
create table product_dimensions (
  product_id uuid not null references products on delete cascade,
  restaurant_id uuid not null references restaurants on delete cascade,
  kind text not null check (kind in ('food','packaging')),
  width_cm numeric(6,2) not null check (width_cm > 0),
  depth_cm numeric(6,2) not null check (depth_cm > 0),
  height_cm numeric(6,2) not null check (height_cm > 0),
  primary key (product_id, kind)
);

-- Modelo 3D separado do produto: substituir não perde dados.
create table product_models (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products on delete cascade,
  restaurant_id uuid not null references restaurants on delete cascade,
  glb_path text, usdz_path text,
  file_size_bytes bigint,
  measured_width_m numeric, measured_depth_m numeric, measured_height_m numeric,
  scale_factor numeric not null default 1,
  status text not null default 'pending' check (status in ('pending','valid','invalid')),
  source text not null default 'upload' check (source in ('upload','ai_generated')),
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table addons (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants on delete cascade,
  product_id uuid references products on delete cascade,
  name text not null, price_cents int not null check (price_cents >= 0),
  max_qty int not null default 5, is_available boolean default true
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants on delete cascade,
  total_cents int not null, notes text, channel text default 'whatsapp',
  created_at timestamptz default now()
);
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  restaurant_id uuid not null references restaurants on delete cascade,
  product_id uuid references products on delete set null,
  product_name text not null, unit_price_cents int not null, qty int not null,
  addons jsonb default '[]', notes text
);

create table analytics_events (
  id bigserial primary key,
  restaurant_id uuid not null references restaurants on delete cascade,
  product_id uuid references products on delete set null,
  event text not null check (event in ('menu_view','model_view','ar_click')),
  created_at timestamptz default now()
);

create function public.my_restaurants() returns setof uuid
language sql stable security definer set search_path = public as
$$ select restaurant_id from restaurant_members where user_id = auth.uid() $$;

do $$ declare t text; begin
  foreach t in array array['restaurants','restaurant_members','categories','products','product_photos',
    'product_dimensions','product_models','addons','orders','order_items','analytics_events'] loop
    execute format('alter table %I enable row level security', t);
  end loop; end $$;

create policy admin_restaurants on restaurants for all to authenticated
  using (id in (select my_restaurants())) with check (id in (select my_restaurants()));
create policy own_membership on restaurant_members for select to authenticated using (user_id = auth.uid());

do $$ declare t text; begin
  foreach t in array array['categories','products','product_photos','product_dimensions','product_models','addons','orders','order_items'] loop
    execute format('create policy admin_%1$s on %1$I for all to authenticated
      using (restaurant_id in (select my_restaurants()))
      with check (restaurant_id in (select my_restaurants()))', t);
  end loop; end $$;
create policy admin_read_analytics on analytics_events for select to authenticated
  using (restaurant_id in (select my_restaurants()));

create policy public_restaurants on restaurants for select to anon using (is_published);
create policy public_categories on categories for select to anon
  using (is_active and restaurant_id in (select id from restaurants where is_published));
create policy public_products on products for select to anon
  using (is_published and restaurant_id in (select id from restaurants where is_published));
create policy public_photos on product_photos for select to anon
  using (product_id in (select id from products where is_published));
create policy public_dims on product_dimensions for select to anon
  using (product_id in (select id from products where is_published));
create policy public_models on product_models for select to anon
  using (is_active and status = 'valid' and product_id in (select id from products where is_published));
create policy public_addons on addons for select to anon
  using (is_available and restaurant_id in (select id from restaurants where is_published));

create function public.track_event(p_restaurant uuid, p_product uuid, p_event text)
returns void language sql security definer set search_path = public as
$$ insert into analytics_events(restaurant_id, product_id, event)
   select p_restaurant, p_product, p_event
   where exists (select 1 from restaurants where id = p_restaurant and is_published) $$;
grant execute on function public.track_event to anon;

-- Storage: path deve começar com o restaurant_id do usuário.
insert into storage.buckets (id, name, public, file_size_limit) values
  ('photos','photos',true, 5242880), ('models','models',true, 15728640)
on conflict do nothing;
create policy "tenant write" on storage.objects for all to authenticated
  using (bucket_id in ('photos','models') and (storage.foldername(name))[1]::uuid in (select my_restaurants()))
  with check (bucket_id in ('photos','models') and (storage.foldername(name))[1]::uuid in (select my_restaurants()));
create policy "public read" on storage.objects for select to anon using (bucket_id in ('photos','models'));
