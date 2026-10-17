CREATE TABLE IF NOT EXISTS supplier_payables (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE ON UPDATE CASCADE,
    purchase_order_id TEXT NOT NULL UNIQUE REFERENCES purchase_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    amount_accrued DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount_allocated DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_payments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE ON UPDATE CASCADE,
    purchase_order_id TEXT REFERENCES purchase_orders(id) ON DELETE SET NULL ON UPDATE CASCADE,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_method TEXT CHECK(payment_method IN ('cash', 'pos', 'transfer')) NOT NULL,
    bank_name TEXT,
    reference_number TEXT,
    amount_paid DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    employee_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    is_unapplied_credit INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_payment_allocations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    supplier_payment_id TEXT NOT NULL REFERENCES supplier_payments(id) ON DELETE CASCADE ON UPDATE CASCADE,
    supplier_payable_id TEXT NOT NULL REFERENCES supplier_payables(id) ON DELETE CASCADE ON UPDATE CASCADE,
    allocated_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_payables_supplier_id
ON supplier_payables(supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_id
ON supplier_payments(supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_payment_allocations_payment_id
ON supplier_payment_allocations(supplier_payment_id);

CREATE INDEX IF NOT EXISTS idx_supplier_payment_allocations_payable_id
ON supplier_payment_allocations(supplier_payable_id);

INSERT INTO supplier_payables (
    id,
    supplier_id,
    purchase_order_id,
    amount_accrued,
    amount_allocated,
    created_at,
    updated_at
)
SELECT
    lower(hex(randomblob(16))),
    po.supplier_id,
    pr.purchase_order_id,
    SUM(pri.quantity_received * COALESCE(poi.unit_price, 0)),
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM purchase_receipts pr
JOIN purchase_orders po ON po.id = pr.purchase_order_id
JOIN purchase_receipt_items pri ON pri.purchase_receipt_id = pr.id
LEFT JOIN purchase_order_items poi
    ON poi.purchase_order_id = pr.purchase_order_id
    AND poi.product_id = pri.product_id
    AND (
        poi.unit_id = pri.unit_id
        OR (poi.unit_id IS NULL AND pri.unit_id IS NULL)
    )
WHERE pr.status = 'approved'
GROUP BY po.supplier_id, pr.purchase_order_id
HAVING SUM(pri.quantity_received * COALESCE(poi.unit_price, 0)) > 0
ON CONFLICT(purchase_order_id) DO UPDATE SET
    amount_accrued = excluded.amount_accrued,
    updated_at = CURRENT_TIMESTAMP;
