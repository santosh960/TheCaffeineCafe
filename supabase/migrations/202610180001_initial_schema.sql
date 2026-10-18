create extension if not exists pgcrypto;

create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  description text,
  price numeric(10, 2) check (price is null or price >= 0),
  photo_url text,
  dietary_labels text[] not null default '{}',
  is_available boolean not null default false,
  is_published boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_product_has_price check (not is_published or price is not null)
);

create table public.business_settings (
  id integer primary key default 1 check (id = 1),
  business_name text not null default 'The Caffeine Craft Cafe',
  address text not null default 'Prosperity Society, Gulab Vihar, near Vitthal Mandir Road, Ganesh Nagar, Karvenagar, Pune, Maharashtra 411052',
  phone text not null default '077749 63125',
  opening_hours text not null default '11:00 AM – 11:30 PM',
  pickup_enabled boolean not null default false,
  delivery_enabled boolean not null default false,
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  tax_rate numeric(5, 2) not null default 0 check (tax_rate between 0 and 100),
  promotion_code text,
  promotion_description text,
  promotion_percent numeric(5, 2) not null default 0 check (promotion_percent between 0 and 100),
  rating_reference numeric(2, 1) not null default 4.9 check (rating_reference between 0 and 5),
  review_count_reference integer not null default 203 check (review_count_reference >= 0),
  rating_verified boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.business_settings (id) values (1) on conflict (id) do nothing;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  notes text,
  fulfillment text not null check (fulfillment in ('pickup', 'delivery')),
  delivery_address text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  tax numeric(10, 2) not null default 0 check (tax >= 0),
  fee numeric(10, 2) not null default 0 check (fee >= 0),
  discount numeric(10, 2) not null default 0 check (discount >= 0),
  total numeric(10, 2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_address_required check (fulfillment <> 'delivery' or nullif(trim(delivery_address), '') is not null)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total numeric(10, 2) not null check (line_total >= 0)
);

create index products_public_lookup on public.products (is_published, is_available, category_id);
create index orders_created_at on public.orders (created_at desc);
create index orders_phone_number on public.orders (customer_phone, order_number);
create index order_items_order_id on public.order_items (order_id);

create sequence public.order_number_seq;
revoke all on sequence public.order_number_seq from public, anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.business_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Users may read their own profile"
  on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "Admins manage profiles"
  on public.profiles for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Public reads active categories"
  on public.categories for select to anon, authenticated using (is_active);
create policy "Admins manage categories"
  on public.categories for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Public reads confirmed menu"
  on public.products for select to anon, authenticated
  using (is_published and is_available and price is not null);
create policy "Admins manage products"
  on public.products for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Public reads cafe information"
  on public.business_settings for select to anon, authenticated using (true);
create policy "Admins manage cafe information"
  on public.business_settings for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Admins read all orders"
  on public.orders for select to authenticated using ((select private.is_admin()));
create policy "Admins update orders"
  on public.orders for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins read order items"
  on public.order_items for select to authenticated using ((select private.is_admin()));

grant select on public.categories, public.products, public.business_settings to anon, authenticated;
grant select on public.profiles to authenticated;
grant insert, update, delete on public.categories, public.products to authenticated;
grant insert, update, delete on public.business_settings to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;

create or replace function public.create_customer_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_notes text,
  p_items jsonb,
  p_fulfillment text default 'pickup',
  p_delivery_address text default null,
  p_promotion_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_number text := 'TCC-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD')
    || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
  v_name text := trim(coalesce(p_customer_name, ''));
  v_phone text := regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g');
  v_subtotal numeric(10, 2);
  v_tax numeric(10, 2);
  v_fee numeric(10, 2);
  v_discount numeric(10, 2) := 0;
  v_total numeric(10, 2);
  v_tax_rate numeric(5, 2);
  v_promotion_percent numeric(5, 2);
  v_settings public.business_settings%rowtype;
begin
  if length(v_name) < 2 or length(v_name) > 100 then
    raise exception 'Enter a valid customer name.';
  end if;
  if length(v_phone) not in (10, 12) or (length(v_phone) = 10 and v_phone !~ '^[6-9][0-9]{9}$') or (length(v_phone) = 12 and v_phone !~ '^91[6-9][0-9]{9}$') then
    raise exception 'Enter a valid Indian mobile number.';
  end if;
  if length(v_phone) = 12 then v_phone := right(v_phone, 10); end if;
  if p_customer_email is not null and (length(p_customer_email) > 254 or p_customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'Enter a valid email address.';
  end if;
  if p_notes is not null and length(p_notes) > 500 then raise exception 'Order notes are too long.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'Your cart is empty or contains too many items.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as item
    where coalesce(item->>'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or case
        when coalesce(item->>'quantity', '') ~ '^[0-9]{1,2}$'
          then (item->>'quantity')::integer not between 1 and 20
        else true
      end
  ) then raise exception 'Your cart has invalid items.'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) item
    group by item->>'product_id' having count(*) > 1
  ) then raise exception 'Remove duplicate items from your cart and try again.'; end if;

  select * into v_settings from public.business_settings where id = 1;
  if p_fulfillment = 'pickup' and not v_settings.pickup_enabled then raise exception 'Online pickup is not enabled.'; end if;
  if p_fulfillment = 'delivery' and not v_settings.delivery_enabled then raise exception 'Delivery is not enabled.'; end if;
  if p_fulfillment not in ('pickup', 'delivery') then raise exception 'Choose a valid fulfillment option.'; end if;
  if p_fulfillment = 'delivery' and (p_delivery_address is null or length(trim(p_delivery_address)) < 8 or length(p_delivery_address) > 500) then
    raise exception 'Enter a valid delivery address.';
  end if;
  if p_fulfillment = 'pickup' and p_delivery_address is not null then raise exception 'Delivery address is not needed for pickup.'; end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) requested
    left join public.products product on product.id = (requested->>'product_id')::uuid
    where product.id is null or not product.is_published or not product.is_available or product.price is null
  ) then raise exception 'One or more items are unavailable. Please refresh your menu.'; end if;

  select round(sum(product.price * (requested->>'quantity')::integer), 2)
    into v_subtotal
    from jsonb_array_elements(p_items) requested
    join public.products product on product.id = (requested->>'product_id')::uuid;
  v_tax_rate := v_settings.tax_rate;
  v_tax := round(v_subtotal * v_tax_rate / 100, 2);
  v_fee := case when p_fulfillment = 'delivery' then v_settings.delivery_fee else 0 end;
  if v_settings.promotion_code is not null
     and upper(trim(coalesce(p_promotion_code, ''))) = upper(v_settings.promotion_code)
     and v_settings.promotion_percent > 0 then
    v_promotion_percent := v_settings.promotion_percent;
    v_discount := round(v_subtotal * v_promotion_percent / 100, 2);
  end if;
  v_total := greatest(0, v_subtotal + v_tax + v_fee - v_discount);

  insert into public.orders (
    id, order_number, user_id, customer_name, customer_phone, customer_email, notes,
    fulfillment, delivery_address, subtotal, tax, fee, discount, total
  ) values (
    v_order_id, v_order_number, (select auth.uid()), v_name, v_phone,
    nullif(trim(p_customer_email), ''), nullif(trim(p_notes), ''),
    p_fulfillment, nullif(trim(p_delivery_address), ''), v_subtotal, v_tax, v_fee, v_discount, v_total
  );
  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
    select v_order_id, product.id, product.name, product.price, (requested->>'quantity')::integer,
      round(product.price * (requested->>'quantity')::integer, 2)
    from jsonb_array_elements(p_items) requested
    join public.products product on product.id = (requested->>'product_id')::uuid;
  return jsonb_build_object(
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'fee', v_fee,
    'discount', v_discount,
    'total', v_total
  );
end;
$$;

create or replace function public.get_customer_order(p_order_number text, p_customer_phone text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_number', order_row.order_number,
    'status', order_row.status,
    'created_at', order_row.created_at
  )
  from public.orders order_row
  where order_row.order_number = upper(trim(p_order_number))
    and order_row.customer_phone = right(regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g'), 10)
  limit 1;
$$;

revoke all on function public.create_customer_order(text, text, text, text, jsonb, text, text, text) from public;
revoke all on function public.get_customer_order(text, text) from public;
grant execute on function public.create_customer_order(text, text, text, text, jsonb, text, text, text) to anon, authenticated;
grant execute on function public.get_customer_order(text, text) to anon, authenticated;

insert into public.categories (name, sort_order) values
  ('Coffee & More', 1),
  ('Coolers & Shakes', 2),
  ('Bites', 3)
on conflict (name) do nothing;

insert into public.products (name, description, category_id, price, is_available, is_published, status)
select draft.name, null, category.id, null, false, false, 'draft'
from (values
  ('Iced Coffee', 'Coffee & More'),
  ('Cold Coffee Frappe', 'Coolers & Shakes'),
  ('Passion Fruit Iced Tea', 'Coolers & Shakes'),
  ('Crunchy Chocolate Shake', 'Coolers & Shakes'),
  ('Hot Chocolate', 'Coffee & More'),
  ('Tandoori Paneer Pizza', 'Bites'),
  ('Sandwiches', 'Bites'),
  ('Masala Maggi', 'Bites')
) as draft(name, category_name)
join public.categories category on category.name = draft.category_name
where not exists (select 1 from public.products existing where existing.name = draft.name);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Public may view product photos"
  on storage.objects for select to anon, authenticated using (bucket_id = 'product-photos');
create policy "Admins manage product photos"
  on storage.objects for all to authenticated
  using (bucket_id = 'product-photos' and (select private.is_admin()))
  with check (bucket_id = 'product-photos' and (select private.is_admin()));
