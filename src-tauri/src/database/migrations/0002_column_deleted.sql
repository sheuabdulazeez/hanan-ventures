CREATE TABLE IF NOT EXISTS purchase_orders_new (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    status TEXT CHECK(status IN ('pending', 'partially_received', 'received', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO purchase_orders_new (
    id,
    order_date,
    supplier_id,
    status,
    created_at,
    updated_at
)
SELECT
    id,
    order_date,
    supplier_id,
    status,
    created_at,
    updated_at
FROM purchase_orders;

DROP TABLE purchase_orders;

ALTER TABLE purchase_orders_new RENAME TO purchase_orders;

CREATE TABLE IF NOT EXISTS purchase_order_items_new (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    quantity_ordered INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO purchase_order_items_new (
    id,
    purchase_order_id,
    product_id,
    quantity_ordered,
    unit_price,
    created_at,
    updated_at
)
SELECT
    id,
    purchase_order_id,
    product_id,
    quantity_ordered,
    unit_price,
    created_at,
    updated_at
FROM purchase_order_items;

DROP TABLE purchase_order_items;

ALTER TABLE purchase_order_items_new RENAME TO purchase_order_items;

CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    quantity_changed INTEGER NOT NULL,
    reason TEXT
);
