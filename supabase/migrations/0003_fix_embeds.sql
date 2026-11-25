-- Corrige ambiguidade de relacionamentos criada na 0002: mantém só as FKs compostas (produto + restaurante).
alter table product_photos     drop constraint if exists product_photos_product_id_fkey;
alter table product_dimensions drop constraint if exists product_dimensions_product_id_fkey;
alter table product_models     drop constraint if exists product_models_product_id_fkey;
alter table addons             drop constraint if exists addons_product_id_fkey;
alter table products           drop constraint if exists products_category_id_fkey;
alter table order_items        drop constraint if exists order_items_order_id_fkey;
notify pgrst, 'reload schema';
