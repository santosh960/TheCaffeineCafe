PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price REAL CHECK (price IS NULL OR price >= 0),
  photo_url TEXT,
  dietary_labels TEXT NOT NULL DEFAULT '[]',
  is_available INTEGER NOT NULL DEFAULT 0 CHECK (is_available IN (0, 1)),
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (is_published = 0 OR price IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS business_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  opening_hours TEXT NOT NULL,
  pickup_enabled INTEGER NOT NULL DEFAULT 0 CHECK (pickup_enabled IN (0, 1)),
  delivery_enabled INTEGER NOT NULL DEFAULT 0 CHECK (delivery_enabled IN (0, 1)),
  delivery_fee REAL NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  tax_rate REAL NOT NULL DEFAULT 0 CHECK (tax_rate BETWEEN 0 AND 100),
  promotion_code TEXT,
  promotion_description TEXT,
  promotion_percent REAL NOT NULL DEFAULT 0 CHECK (promotion_percent BETWEEN 0 AND 100),
  rating_reference REAL NOT NULL DEFAULT 4.9 CHECK (rating_reference BETWEEN 0 AND 5),
  review_count_reference INTEGER NOT NULL DEFAULT 203 CHECK (review_count_reference >= 0),
  rating_verified INTEGER NOT NULL DEFAULT 0 CHECK (rating_verified IN (0, 1))
);

CREATE TABLE IF NOT EXISTS site_content (
  content_key TEXT PRIMARY KEY,
  content_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  notes TEXT,
  fulfillment TEXT NOT NULL CHECK (fulfillment IN ('pickup', 'delivery')),
  delivery_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
  subtotal REAL NOT NULL CHECK (subtotal >= 0),
  tax REAL NOT NULL DEFAULT 0 CHECK (tax >= 0),
  fee REAL NOT NULL DEFAULT 0 CHECK (fee >= 0),
  discount REAL NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total REAL NOT NULL CHECK (total >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (fulfillment <> 'delivery' OR length(trim(delivery_address)) >= 8)
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit_price REAL NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  line_total REAL NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS order_counter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS products_public_lookup ON products(is_published, is_available, category_id);
CREATE INDEX IF NOT EXISTS orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_lookup ON orders(customer_phone, order_number);
CREATE INDEX IF NOT EXISTS order_items_by_order ON order_items(order_id);
