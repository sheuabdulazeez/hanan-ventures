-- Recreate purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders_new (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    employee_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status TEXT CHECK(status IN ('pending', 'partially_received', 'received', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Copy data (Using INSERT OR IGNORE to handle potential column mismatches safely, though explicit column list is safer if known)
-- Since we know valid columns from 0001 + new columns, we try to copy what exists.
-- However, SQLite copy requires matching columns. We'll select explicitly where possible or use defaults.
INSERT INTO purchase_orders_new (id, order_date, supplier_id, employee_id, total_cost, status, created_at, updated_at)
SELECT 
    id, 
    order_date, 
    supplier_id, 
    employee_id, 
    COALESCE(total_cost, 0), -- total_cost might be new, use 0 if copying from old schema that somehow had it (or use ALTER fallback logic conceptually)
    status, 
    created_at, 
    updated_at 
FROM purchase_orders;

DROP TABLE purchase_orders;
ALTER TABLE purchase_orders_new RENAME TO purchase_orders;

-- Recreate purchase_order_items table (to ensure total_price)
CREATE TABLE IF NOT EXISTS purchase_order_items_new (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    quantity_ordered INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO purchase_order_items_new (id, purchase_order_id, product_id, quantity_ordered, unit_price, total_price, created_at, updated_at)
SELECT 
    id, 
    purchase_order_id, 
    product_id, 
    quantity_ordered, 
    unit_price, 
    quantity_ordered * unit_price, -- Calculate total_price on fly if missing
    created_at, 
    updated_at 
FROM purchase_order_items;

DROP TABLE purchase_order_items;
ALTER TABLE purchase_order_items_new RENAME TO purchase_order_items;

-- Ensure Business Name is Set
UPDATE admin_settings SET value = 'POS System' WHERE key = 'name';