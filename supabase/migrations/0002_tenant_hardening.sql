-- Etapa 2: criação de clientes por comando + isolamento reforçado entre restaurantes.

-- 1) Integridade entre clientes: filhos só podem apontar para pais do MESMO restaurante.
alter table categories add constraint categories_id_rest_uq unique (id, restaurant_id);
alter table products   add constraint products_id_rest_uq   unique (id, restaurant_id);
alter table orders     add constraint orders_id_rest_uq     unique (id, restaurant_id);

alter table products add constraint products_category_tenant_fk
  foreign key (category_id, restaurant_id) references categories (id, restaurant_id) on delete set null (category_id);
alter table product_photos add constraint product_photos_tenant_fk
  foreign key (product_id, restaurant_id) references products (id, restaurant_id) on delete cascade;
alter table product_dimensions add constraint product_dimensions_tenant_fk
  foreign key (product_id, restaurant_id) references products (id, restaurant_id) on delete cascade;
alter table product_models add constraint product_models_tenant_fk
  foreign key (product_id, restaurant_id) references products (id, restaurant_id) on delete cascade;
alter table addons add constraint addons_tenant_fk
  foreign key (product_id, restaurant_id) references products (id, restaurant_id) on delete cascade;
alter table order_items add constraint order_items_tenant_fk
  foreign key (order_id, restaurant_id) references orders (id, restaurant_id) on delete cascade;

-- 2) Leitura pública também vale para quem está logado (o dono abre o cardápio logado).
do $$ declare t text; begin
  foreach t in array array['restaurants','categories','products','product_photos','product_dimensions','product_models','addons'] loop
    execute format('alter policy %I on %I to anon, authenticated',
      case t when 'product_dimensions' then 'public_dims' when 'product_photos' then 'public_photos'
        when 'product_models' then 'public_models' else 'public_' || t end, t);
  end loop; end $$;

-- 3) Analytics: o produto precisa pertencer ao restaurante informado.
create or replace function public.track_event(p_restaurant uuid, p_product uuid, p_event text)
returns void language sql security definer set search_path = public as
$$ insert into analytics_events(restaurant_id, product_id, event)
   select p_restaurant, p_product, p_event
   where p_event in ('menu_view','model_view','ar_click')
     and exists (select 1 from restaurants where id = p_restaurant and is_published)
     and (p_product is null or exists (select 1 from products where id = p_product and restaurant_id = p_restaurant)) $$;

-- 4) Novo cliente por comando (só você, pelo SQL Editor; ninguém pelo app).
create or replace function public.create_restaurant(p_slug text, p_name text, p_owner_email text)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid; v_rid uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(p_owner_email);
  if v_uid is null then
    raise exception 'Usuário % não existe. Crie em Authentication > Users antes.', p_owner_email;
  end if;
  insert into restaurants (slug, name) values (lower(p_slug), p_name) returning id into v_rid;
  insert into restaurant_members (restaurant_id, user_id, role) values (v_rid, v_uid, 'owner');
  return v_rid;
end $$;
revoke all on function public.create_restaurant(text, text, text) from public, anon, authenticated;
