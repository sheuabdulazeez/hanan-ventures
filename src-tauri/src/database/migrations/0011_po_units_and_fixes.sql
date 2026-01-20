-- Recreate purchase_order_items with unit_id
CREATE TABLE IF NOT EXISTS purchase_order_items_new (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    unit_id TEXT REFERENCES product_units(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    quantity_ordered INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO purchase_order_items_new (id, purchase_order_id, product_id, quantity_ordered, unit_price, total_price, created_at, updated_at)
SELECT id, purchase_order_id, product_id, quantity_ordered, unit_price, total_price, created_at, updated_at
FROM purchase_order_items;

DROP TABLE purchase_order_items;
ALTER TABLE purchase_order_items_new RENAME TO purchase_order_items;

-- Recreate purchase_receipt_items with unit_id
CREATE TABLE IF NOT EXISTS purchase_receipt_items_new (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    purchase_receipt_id TEXT NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    unit_id TEXT REFERENCES product_units(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    quantity_received INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO purchase_receipt_items_new (id, purchase_receipt_id, product_id, quantity_received, created_at, updated_at)
SELECT id, purchase_receipt_id, product_id, quantity_received, created_at, updated_at
FROM purchase_receipt_items;

DROP TABLE purchase_receipt_items;
ALTER TABLE purchase_receipt_items_new RENAME TO purchase_receipt_items;
