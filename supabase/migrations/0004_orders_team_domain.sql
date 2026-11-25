-- Etapa 4: pedidos salvos, equipe por convite, domínio próprio.
alter table orders add column if not exists status text not null default 'novo' check (status in ('novo','preparo','concluido','cancelado'));
alter table restaurants add column if not exists custom_domain text unique;

-- Pedido gravado pelo servidor: preços vêm do banco, nunca do navegador.
create or replace function public.place_order(p_restaurant uuid, p_items jsonb, p_notes text default null)
returns table (order_id uuid, code text) language plpgsql security definer set search_path = public as $$
declare v_order uuid := gen_random_uuid(); v_total int := 0; it jsonb; ad jsonb; v_prod record; v_add record; v_line int; v_addons jsonb; v_qty int; v_aq int;
begin
  if not exists (select 1 from restaurants where id = p_restaurant and is_published) then raise exception 'restaurante indisponível'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 40 then raise exception 'itens inválidos'; end if;
  insert into orders (id, restaurant_id, total_cents, notes) values (v_order, p_restaurant, 0, left(p_notes, 500));
  for it in select jsonb_array_elements(p_items) loop
    v_qty := greatest(1, least(coalesce((it->>'qty')::int, 1), 50));
    select id, name, price_cents into v_prod from products
      where id = (it->>'product_id')::uuid and restaurant_id = p_restaurant and is_published and is_available;
    if not found then raise exception 'produto indisponível'; end if;
    v_line := v_prod.price_cents; v_addons := '[]'::jsonb;
    for ad in select jsonb_array_elements(coalesce(it->'addons', '[]'::jsonb)) loop
      v_aq := greatest(1, least(coalesce((ad->>'qty')::int, 1), 20));
      select id, name, price_cents into v_add from addons
        where id = (ad->>'id')::uuid and restaurant_id = p_restaurant and is_available and (product_id is null or product_id = v_prod.id);
      if not found then raise exception 'adicional indisponível'; end if;
      v_line := v_line + v_add.price_cents * v_aq;
      v_addons := v_addons || jsonb_build_array(jsonb_build_object('name', v_add.name, 'qty', v_aq, 'price_cents', v_add.price_cents));
    end loop;
    insert into order_items (order_id, restaurant_id, product_id, product_name, unit_price_cents, qty, addons, notes)
      values (v_order, p_restaurant, v_prod.id, v_prod.name, v_line, v_qty, v_addons, left(it->>'notes', 300));
    v_total := v_total + v_line * v_qty;
  end loop;
  update orders set total_cents = v_total where id = v_order;
  return query select v_order, upper(substr(replace(v_order::text, '-', ''), 1, 6));
end $$;
revoke all on function public.place_order(uuid, jsonb, text) from public;
grant execute on function public.place_order(uuid, jsonb, text) to anon, authenticated;

-- Convites de equipe
create table if not exists restaurant_invites (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants on delete cascade,
  email text not null, role text not null default 'editor' check (role in ('owner','editor')),
  created_at timestamptz default now(), unique (restaurant_id, email));
alter table restaurant_invites enable row level security;
create policy owner_invites on restaurant_invites for all to authenticated
  using (exists (select 1 from restaurant_members m where m.restaurant_id = restaurant_invites.restaurant_id and m.user_id = auth.uid() and m.role = 'owner'))
  with check (exists (select 1 from restaurant_members m where m.restaurant_id = restaurant_invites.restaurant_id and m.user_id = auth.uid() and m.role = 'owner'));

create or replace function public.team_members(p_restaurant uuid) returns table (user_id uuid, email text, role text)
language sql stable security definer set search_path = public, auth as $$
  select m.user_id, u.email::text, m.role from restaurant_members m join auth.users u on u.id = m.user_id
  where m.restaurant_id = p_restaurant and p_restaurant in (select restaurant_id from restaurant_members where user_id = auth.uid()) $$;

create or replace function public.accept_invites() returns int language plpgsql security definer set search_path = public, auth as $$
declare n int := 0; v_email text;
begin
  select email into v_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if v_email is null then return 0; end if;
  insert into restaurant_members (restaurant_id, user_id, role)
    select restaurant_id, auth.uid(), role from restaurant_invites where lower(email) = lower(v_email)
    on conflict (restaurant_id, user_id) do nothing;
  get diagnostics n = row_count;
  delete from restaurant_invites where lower(email) = lower(v_email);
  return n;
end $$;

create or replace function public.remove_member(p_restaurant uuid, p_user uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from restaurant_members where restaurant_id = p_restaurant and user_id = auth.uid() and role = 'owner') then raise exception 'sem permissão'; end if;
  if p_user = auth.uid() then raise exception 'você não pode remover a si mesmo'; end if;
  delete from restaurant_members where restaurant_id = p_restaurant and user_id = p_user;
end $$;
revoke all on function public.team_members(uuid), public.accept_invites(), public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.team_members(uuid), public.accept_invites(), public.remove_member(uuid, uuid) to authenticated;
notify pgrst, 'reload schema';
