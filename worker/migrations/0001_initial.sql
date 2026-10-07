PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  family TEXT NOT NULL,
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  typical_uses TEXT,
  configuration_fields TEXT,
  template TEXT NOT NULL,
  commercial_mode TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  public_visibility INTEGER NOT NULL DEFAULT 0 CHECK (public_visibility IN (0, 1)),
  production_approved INTEGER NOT NULL DEFAULT 0 CHECK (production_approved IN (0, 1)),
  approved_by INTEGER,
  approved_at TEXT,
  approval_note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  profile_json TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS quote_requests (
  id INTEGER PRIMARY KEY,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'awaiting_customer', 'quoted', 'closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quote_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id INTEGER NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  configuration_json TEXT NOT NULL,
  matched_price_pkr TEXT,
  evaluation_json TEXT
);

CREATE TABLE IF NOT EXISTS artwork_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id INTEGER NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id INTEGER NOT NULL UNIQUE REFERENCES quote_requests(id),
  job_reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('awaiting_customer_approval', 'approved', 'in_production', 'quality_check', 'ready', 'completed', 'on_hold', 'cancelled')),
  specification_snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS price_matrix (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  configuration_hash TEXT NOT NULL,
  price_pkr TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0 CHECK (approved IN (0, 1)),
  approved_by INTEGER NOT NULL,
  approved_at TEXT NOT NULL,
  UNIQUE (product_id, configuration_hash)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quote_rate_limits (
  bucket_hash TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL,
  window_started_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS web_sessions (
  sid TEXT PRIMARY KEY,
  session_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_visibility ON products(status, public_visibility, production_approved, sort_order);
CREATE INDEX IF NOT EXISTS idx_quotes_created ON quote_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_artwork_quote ON artwork_files(quote_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON web_sessions(expires_at);
