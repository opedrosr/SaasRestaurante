-- Prova de isolamento. Rode inteiro no SQL Editor. Não deixa nada no banco (termina em ROLLBACK).
-- Resultado esperado: mensagem "OK: isolamento entre restaurantes verificado".
begin;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@teste.local');
select create_restaurant('teste-a', 'Teste A', 'a@teste.local');
select create_restaurant('teste-b', 'Teste B', 'b@teste.local');
insert into products (restaurant_id, name, price_cents) select id, 'Produto B', 1000 from restaurants where slug = 'teste-b';

do $$
declare ra uuid; rb uuid; pb uuid; n int; denied boolean;
begin
  select id into ra from restaurants where slug = 'teste-a';
  select id into rb from restaurants where slug = 'teste-b';
  select id into pb from products where restaurant_id = rb limit 1;

  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;

  select count(*) into n from products where restaurant_id = rb;
  assert n = 0, 'FALHA: A enxergou produto de B';

  denied := false;
  begin insert into categories (restaurant_id, name) values (rb, 'x'); exception when others then denied := true; end;
  assert denied, 'FALHA: A criou categoria em B';

  denied := false;
  begin update products set name = 'invadido' where id = pb; if not found then denied := true; end if; exception when others then denied := true; end;
  assert denied, 'FALHA: A alterou produto de B';

  denied := false;
  begin insert into product_photos (product_id, restaurant_id, storage_path) values (pb, ra, 'x'); exception when others then denied := true; end;
  assert denied, 'FALHA: A anexou foto a produto de B';

  reset role;
  raise notice 'OK: isolamento entre restaurantes verificado';
end $$;
rollback;
