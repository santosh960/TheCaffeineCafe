begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(9);

select has_table('public', 'orders', 'orders table exists');
select has_table('public', 'order_items', 'order items table exists');
select ok(
  has_function_privilege(
    'anon',
    'public.create_customer_order(text,text,text,text,jsonb,text,text,text)',
    'EXECUTE'
  ),
  'anonymous customers can call the validated checkout RPC'
);
select ok(
  not has_table_privilege('anon', 'public.orders', 'SELECT'),
  'anonymous customers cannot query private order records'
);
select ok(
  has_table_privilege('authenticated', 'public.products', 'UPDATE')
    and exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'products'
        and policyname = 'Admins manage products'
    ),
  'authenticated product updates are constrained by the admin-only RLS policy'
);
select is(
  (select count(*)::integer from public.products product
   join public.categories category on category.id = product.category_id
   where category.name in ('Cold Beverages', 'Milkshakes', 'Hot Beverages')
     and product.price is not null and product.is_published and product.is_available),
  46,
  'all 46 PDF menu items have prices and are published and available'
);

create temporary table checkout_test_order (order_number text);
insert into public.business_settings (id, pickup_enabled, delivery_enabled, tax_rate, promotion_code, promotion_percent)
values (1, true, false, 5, 'TEST10', 10)
on conflict (id) do update set pickup_enabled = true, delivery_enabled = false, tax_rate = 5,
  promotion_code = 'TEST10', promotion_percent = 10;

with test_category as (
  insert into public.categories (name, is_active)
  values ('Checkout integration test', true)
  on conflict (name) do update set is_active = true
  returning id
), test_product as (
  insert into public.products (category_id, name, price, is_available, is_published, status)
  select id, 'Integration test coffee', 100, true, true, 'published' from test_category
  returning id
)
insert into checkout_test_order (order_number)
select checkout.order_data->>'order_number'
from test_product,
     lateral public.create_customer_order(
       'Test Customer', '9876543210', null, null,
       jsonb_build_array(jsonb_build_object('product_id', test_product.id, 'quantity', 2)),
       'pickup', null, 'TEST10'
     ) checkout(order_data);

select is(
  (select count(*)::integer from public.orders o
   join checkout_test_order t using (order_number)),
  1,
  'checkout creates a persistent order record'
);
select is(
  (select count(*)::integer from public.order_items i
   join public.orders o on o.id = i.order_id
   join checkout_test_order t using (order_number)),
  1,
  'checkout persists a server-priced order item'
);
select is(
  (select o.total from public.orders o join checkout_test_order t using (order_number)),
  190::numeric,
  'checkout calculates tax and promotion from trusted database prices'
);

select * from finish();
rollback;
