-- Create new table with desired structure
CREATE TABLE IF NOT EXISTS inventory_adjustments_new (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    adjustment_type TEXT CHECK(adjustment_type IN ('increase', 'decrease')) NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by TEXT REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Copy existing data to new table (add adjustment_type as well because it doesn't exist in the previous table, we can determine that by the quantity (- for decrease, + for increase))
INSERT INTO inventory_adjustments_new (id, product_id, adjustment_type, quantity, reason, created_at, changed_by)
SELECT id, product_id, 
    CASE 
        WHEN quantity_changed < 0 THEN 'decrease'
        ELSE 'increase'
    END as adjustment_type,
    ABS(quantity_changed) as quantity,
    reason,
    CURRENT_TIMESTAMP as created_at,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1) as changed_by
FROM inventory_adjustments;

-- Drop old table
DROP TABLE inventory_adjustments;

-- Rename new table to original name
ALTER TABLE inventory_adjustments_new RENAME TO inventory_adjustments;
