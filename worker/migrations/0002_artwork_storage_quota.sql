-- HDC-only usage counters and conservative limits for private artwork in R2.
CREATE TABLE IF NOT EXISTS artwork_storage_quota (
  singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
  used_bytes INTEGER NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  reserved_bytes INTEGER NOT NULL DEFAULT 0 CHECK (reserved_bytes >= 0),
  stored_files INTEGER NOT NULL DEFAULT 0 CHECK (stored_files >= 0),
  reserved_files INTEGER NOT NULL DEFAULT 0 CHECK (reserved_files >= 0),
  write_count INTEGER NOT NULL DEFAULT 0 CHECK (write_count >= 0),
  download_count INTEGER NOT NULL DEFAULT 0 CHECK (download_count >= 0)
);

INSERT OR IGNORE INTO artwork_storage_quota (singleton_id) VALUES (1);
