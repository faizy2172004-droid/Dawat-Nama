PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  collection TEXT NOT NULL DEFAULT 'Signature Collection',
  description TEXT NOT NULL DEFAULT '',
  price_pkr INTEGER NOT NULL DEFAULT 0,
  cover_image TEXT NOT NULL DEFAULT '',
  demo_style TEXT NOT NULL DEFAULT 'emerald',
  active INTEGER NOT NULL DEFAULT 1,
  is_custom INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_type TEXT NOT NULL CHECK(order_type IN ('ready_made','custom')),
  customer_id TEXT NOT NULL,
  template_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  amount_pkr INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  reference_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id),
  FOREIGN KEY(template_id) REFERENCES templates(id)
);

CREATE TABLE IF NOT EXISTS couple_details (
  order_id TEXT PRIMARY KEY,
  bride_name TEXT NOT NULL,
  bride_father TEXT DEFAULT '',
  groom_name TEXT NOT NULL,
  groom_father TEXT DEFAULT '',
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  event_index INTEGER NOT NULL,
  event_name TEXT NOT NULL,
  event_date TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  maps_url TEXT DEFAULT '',
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  template_id TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(template_id) REFERENCES templates(id)
);

CREATE TABLE IF NOT EXISTS payment_records (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT '',
  transaction_reference TEXT DEFAULT '',
  proof_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted',
  admin_note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_requests (
  order_id TEXT PRIMARY KEY,
  style_preference TEXT DEFAULT '',
  reference_links TEXT DEFAULT '',
  budget_note TEXT DEFAULT '',
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_invitations_slug ON invitations(slug);

INSERT OR IGNORE INTO templates
(id, slug, name, collection, description, price_pkr, cover_image, demo_style, active, is_custom)
VALUES
('tpl-royal-gold','royal-gold','The Royal Gold','Signature Collection','A timeless palace-inspired invitation with antique gold detailing.',4500,'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85','gold',1,0),
('tpl-emerald','emerald-heirloom','Emerald Heirloom','Signature Collection','Deep emerald tones, botanical accents and understated elegance.',4000,'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=85','emerald',1,0),
('tpl-ivory-bloom','ivory-bloom','Ivory Bloom','Floral Collection','Soft ivory florals and graceful typography for a romantic celebration.',3500,'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=85','ivory',1,0),
('tpl-siyah-zar','siyah-o-zar','Siyah-o-Zar','Heritage Collection','A dramatic black-and-gold invitation inspired by traditional grandeur.',5000,'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=85','black',1,0);