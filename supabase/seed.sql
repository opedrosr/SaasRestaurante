-- Dados demonstrativos. Nenhum produto vem com modelo 3D ou foto: envie pelo painel.
insert into restaurants (slug,name,tagline,address,whatsapp,opening_hours,is_published)
values ('stack-burger','STACK BURGER','Empilhado com intenção.','Rua Exemplo, 123 — Contagem/MG','5531900000000','{"text":"Ter a dom, 18h às 23h"}',true)
on conflict (slug) do nothing;

with r as (select id from restaurants where slug='stack-burger'),
c as (insert into categories (restaurant_id,name,sort_order)
  select r.id, n, o from r, (values ('Burgers clássicos',0),('Burgers especiais',1),('Smash burgers',2),('Combos',3),('Acompanhamentos',4),('Bebidas',5),('Sobremesas',6)) v(n,o) returning id,name,restaurant_id)
insert into products (restaurant_id,category_id,name,description,price_cents,ingredients,weight_g,is_featured,is_published,sort_order)
select c.restaurant_id, c.id, p.n, p.d, p.pr, string_to_array(p.i,','), p.w, p.f, true, p.o
from c join (values
 ('Burgers clássicos','Classic Burger','Blend 160 g, queijo prato, alface, tomate e maionese da casa.',2800,'pão brioche,blend 160 g,queijo prato,alface,tomate,maionese',280,false,1),
 ('Burgers clássicos','Cheese Burger','Blend 160 g com cheddar derretido e picles.',3000,'pão brioche,blend 160 g,cheddar,picles',290,false,2),
 ('Burgers clássicos','Bacon Burger','Blend 160 g, bacon crocante e cheddar.',3400,'pão brioche,blend 160 g,bacon,cheddar',310,false,3),
 ('Burgers especiais','Stack Supreme','Dois blends, cheddar, bacon, cebola caramelizada e molho especial.',4800,'pão brioche,2 blends 120 g,cheddar,bacon,cebola caramelizada,molho especial',420,true,1),
 ('Burgers especiais','Double Melt','Dois blends com queijo suíço e cebola grelhada.',4400,'pão australiano,2 blends 120 g,queijo suíço,cebola grelhada',400,false,2),
 ('Burgers especiais','Truffle Burger','Blend 180 g, maionese trufada e queijo gruyère.',5200,'pão brioche,blend 180 g,gruyère,maionese trufada',330,false,3),
 ('Burgers especiais','BBQ Bacon','Blend 160 g, bacon, onion ring e barbecue defumado.',4200,'pão brioche,blend 160 g,bacon,onion ring,barbecue',360,false,4),
 ('Smash burgers','Double Smash','Dois smashes de 90 g, cheddar e picles.',3600,'pão de batata,2 smashes 90 g,cheddar,picles',260,true,1),
 ('Smash burgers','Triple Smash','Três smashes de 90 g com cheddar duplo.',4400,'pão de batata,3 smashes 90 g,cheddar',340,false,2),
 ('Smash burgers','Smash Cheddar','Smash de 90 g, cheddar e molho da casa.',2800,'pão de batata,smash 90 g,cheddar,molho da casa',200,false,3),
 ('Combos','Combo Classic','Classic Burger, batata e refrigerante.',4600,'classic burger,batata,refrigerante',null,false,1),
 ('Combos','Combo Supreme','Stack Supreme, batata e refrigerante.',6600,'stack supreme,batata,refrigerante',null,false,2),
 ('Combos','Combo Double Smash','Double Smash, batata e refrigerante.',5400,'double smash,batata,refrigerante',null,false,3),
 ('Acompanhamentos','Batata frita tradicional','Porção crocante com sal.',1800,'batata,sal',200,false,1),
 ('Acompanhamentos','Batata com cheddar e bacon','Batata coberta de cheddar e bacon.',2800,'batata,cheddar,bacon',280,false,2),
 ('Acompanhamentos','Onion rings','Anéis de cebola empanados.',2200,'cebola,empanado',180,false,3),
 ('Bebidas','Coca-Cola','Lata 350 ml.',700,'',null,false,1),
 ('Bebidas','Coca-Cola Zero','Lata 350 ml.',700,'',null,false,2),
 ('Bebidas','Guaraná','Lata 350 ml.',650,'',null,false,3),
 ('Bebidas','Milkshake de chocolate','400 ml.',2200,'sorvete,chocolate,leite',null,false,4),
 ('Bebidas','Milkshake de morango','400 ml.',2200,'sorvete,morango,leite',null,false,5),
 ('Sobremesas','Brownie','Brownie de chocolate com sorvete.',2000,'chocolate,sorvete',150,false,1),
 ('Sobremesas','Petit gâteau','Bolinho quente com recheio cremoso.',2400,'chocolate,sorvete',180,false,2),
 ('Sobremesas','Milkshake especial','Milkshake com calda e brownie.',2600,'sorvete,brownie,calda',null,false,3)
) as p(cat,n,d,pr,i,w,f,o) on p.cat = c.name;

-- Dimensões de exemplo (alimento) para os burgers principais
insert into product_dimensions (product_id,restaurant_id,kind,width_cm,depth_cm,height_cm)
select p.id,p.restaurant_id,'food',v.w,v.w,v.h from products p join (values
 ('Stack Supreme',13,10),('Double Smash',12,9),('Classic Burger',12,8)) v(n,w,h) on v.n=p.name
where p.restaurant_id=(select id from restaurants where slug='stack-burger');
insert into product_dimensions (product_id,restaurant_id,kind,width_cm,depth_cm,height_cm)
select p.id,p.restaurant_id,'packaging',16,16,12 from products p where p.name='Double Smash'
and p.restaurant_id=(select id from restaurants where slug='stack-burger');

insert into addons (restaurant_id,name,price_cents,max_qty)
select r.id, n, pr, m from restaurants r, (values ('Bacon extra',600,3),('Cheddar extra',400,3),('Hambúrguer adicional',1200,2),('Cebola caramelizada',400,2),('Molho especial',300,3)) v(n,pr,m)
where r.slug='stack-burger';
