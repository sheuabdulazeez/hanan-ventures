-- Defer foreign key checks (different from disabling)
PRAGMA defer_foreign_keys = ON;

-- Create new table with updated CHECK constraint
CREATE TABLE users_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  phone TEXT DEFAULT '',
  password TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  role TEXT CHECK(role IN ('super_admin', 'admin', 'manager', 'sales')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data
INSERT INTO users_new (id, name, username, phone, password, is_active, role, created_at, updated_at)
SELECT id, name, username, phone, password, is_active, role, created_at, updated_at
FROM users;

-- Drop old table
DROP TABLE users;

-- Rename new table
ALTER TABLE users_new RENAME TO users;

-- Re-enable immediate foreign key checks
PRAGMA defer_foreign_keys = OFF;