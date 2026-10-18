-- Replace the original sample menu with the cafe's supplied 46-item menu.
insert into public.categories (name, sort_order, is_active) values
  ('Cold Beverages', 1, true),
  ('Milkshakes', 2, true),
  ('Hot Beverages', 3, true)
on conflict (name) do update
set sort_order = excluded.sort_order, is_active = true;

delete from public.products
where name in ('Iced Coffee', 'Crunchy Chocolate Shake', 'Hot Chocolate', 'Tandoori Paneer Pizza', 'Sandwiches', 'Masala Maggi');

with menu(name, price, category_name) as (values
  ('Iced Americano', 80, 'Cold Beverages'),
  ('Ice Mocha', 110, 'Cold Beverages'),
  ('Cold Coffee Frappe', 120, 'Cold Beverages'),
  ('Hazelnut Frappe', 140, 'Cold Beverages'),
  ('Vanilla Frappe', 140, 'Cold Beverages'),
  ('Butterscotch Frappe', 140, 'Cold Beverages'),
  ('Caramel Frappe', 140, 'Cold Beverages'),
  ('Choco Chip Frappe', 150, 'Cold Beverages'),
  ('Double Choco Chip Frappe', 160, 'Cold Beverages'),
  ('Green Apple Soda', 110, 'Cold Beverages'),
  ('Classic Mojito', 110, 'Cold Beverages'),
  ('Kiwi Mojito', 110, 'Cold Beverages'),
  ('Strawberry Mint Mojito', 110, 'Cold Beverages'),
  ('Passion Fruit Mojito', 90, 'Cold Beverages'),
  ('Lemon Iced Tea', 90, 'Cold Beverages'),
  ('Peach Iced Tea', 90, 'Cold Beverages'),
  ('Passion Fruit Iced Tea', 90, 'Cold Beverages'),
  ('Rocher Delight', 180, 'Cold Beverages'),
  ('Forest Berries Shake', 140, 'Milkshakes'),
  ('Bubblegum Shake', 140, 'Milkshakes'),
  ('Oreo Shake', 140, 'Milkshakes'),
  ('Nutty Nutella Shake', 150, 'Milkshakes'),
  ('Red Velvet Shake', 140, 'Milkshakes'),
  ('Blueberry Cheesecake Shake', 160, 'Milkshakes'),
  ('KitKat Shake', 170, 'Milkshakes'),
  ('Lotus Biscoff Shake', 170, 'Milkshakes'),
  ('Choco Brownie Crumble Shake', 170, 'Milkshakes'),
  ('Cookie Crumble Shake', 170, 'Milkshakes'),
  ('Americano Black Coffee', 80, 'Hot Beverages'),
  ('Cappuccino', 90, 'Hot Beverages'),
  ('Latte', 90, 'Hot Beverages'),
  ('Mocha', 110, 'Hot Beverages'),
  ('Irish Coffee', 120, 'Hot Beverages'),
  ('Vanilla Cappuccino', 120, 'Hot Beverages'),
  ('Hazelnut Cappuccino', 120, 'Hot Beverages'),
  ('Rose Cappuccino', 120, 'Hot Beverages'),
  ('Hazelnut Latte', 120, 'Hot Beverages'),
  ('Vanilla Latte', 120, 'Hot Beverages'),
  ('Nutella Latte', 120, 'Hot Beverages'),
  ('Biscoff Latte', 120, 'Hot Beverages'),
  ('Plain Hot Chocolate', 110, 'Hot Beverages'),
  ('Oreo Hot Chocolate', 120, 'Hot Beverages'),
  ('Coconut Hot Chocolate', 140, 'Hot Beverages'),
  ('Caramel Hot Chocolate', 140, 'Hot Beverages'),
  ('Roasted Hazelnut Hot Chocolate', 140, 'Hot Beverages'),
  ('Nutella Hot Chocolate', 140, 'Hot Beverages')
)
update public.products product
set category_id = category.id,
    price = menu.price,
    is_available = true,
    is_published = true,
    status = 'published'
from menu
join public.categories category on category.name = menu.category_name
where product.name = menu.name;

with menu(name, price, category_name) as (values
  ('Iced Americano', 80, 'Cold Beverages'), ('Ice Mocha', 110, 'Cold Beverages'),
  ('Cold Coffee Frappe', 120, 'Cold Beverages'), ('Hazelnut Frappe', 140, 'Cold Beverages'),
  ('Vanilla Frappe', 140, 'Cold Beverages'), ('Butterscotch Frappe', 140, 'Cold Beverages'),
  ('Caramel Frappe', 140, 'Cold Beverages'), ('Choco Chip Frappe', 150, 'Cold Beverages'),
  ('Double Choco Chip Frappe', 160, 'Cold Beverages'), ('Green Apple Soda', 110, 'Cold Beverages'),
  ('Classic Mojito', 110, 'Cold Beverages'), ('Kiwi Mojito', 110, 'Cold Beverages'),
  ('Strawberry Mint Mojito', 110, 'Cold Beverages'), ('Passion Fruit Mojito', 90, 'Cold Beverages'),
  ('Lemon Iced Tea', 90, 'Cold Beverages'), ('Peach Iced Tea', 90, 'Cold Beverages'),
  ('Passion Fruit Iced Tea', 90, 'Cold Beverages'), ('Rocher Delight', 180, 'Cold Beverages'),
  ('Forest Berries Shake', 140, 'Milkshakes'), ('Bubblegum Shake', 140, 'Milkshakes'),
  ('Oreo Shake', 140, 'Milkshakes'), ('Nutty Nutella Shake', 150, 'Milkshakes'),
  ('Red Velvet Shake', 140, 'Milkshakes'), ('Blueberry Cheesecake Shake', 160, 'Milkshakes'),
  ('KitKat Shake', 170, 'Milkshakes'), ('Lotus Biscoff Shake', 170, 'Milkshakes'),
  ('Choco Brownie Crumble Shake', 170, 'Milkshakes'), ('Cookie Crumble Shake', 170, 'Milkshakes'),
  ('Americano Black Coffee', 80, 'Hot Beverages'), ('Cappuccino', 90, 'Hot Beverages'),
  ('Latte', 90, 'Hot Beverages'), ('Mocha', 110, 'Hot Beverages'),
  ('Irish Coffee', 120, 'Hot Beverages'), ('Vanilla Cappuccino', 120, 'Hot Beverages'),
  ('Hazelnut Cappuccino', 120, 'Hot Beverages'), ('Rose Cappuccino', 120, 'Hot Beverages'),
  ('Hazelnut Latte', 120, 'Hot Beverages'), ('Vanilla Latte', 120, 'Hot Beverages'),
  ('Nutella Latte', 120, 'Hot Beverages'), ('Biscoff Latte', 120, 'Hot Beverages'),
  ('Plain Hot Chocolate', 110, 'Hot Beverages'), ('Oreo Hot Chocolate', 120, 'Hot Beverages'),
  ('Coconut Hot Chocolate', 140, 'Hot Beverages'), ('Caramel Hot Chocolate', 140, 'Hot Beverages'),
  ('Roasted Hazelnut Hot Chocolate', 140, 'Hot Beverages'), ('Nutella Hot Chocolate', 140, 'Hot Beverages')
)
insert into public.products (name, category_id, price, is_available, is_published, status)
select menu.name, category.id, menu.price, true, true, 'published'
from menu
join public.categories category on category.name = menu.category_name
where not exists (select 1 from public.products product where product.name = menu.name);

delete from public.categories
where name in ('Coffee & More', 'Coolers & Shakes', 'Bites');
