-- Sales are never deleted. A void or a return writes a reversing record: stock goes
-- back, any unpaid debt on the sale is reduced first, and the rest is refunded.
-- Reports read net figures (total_amount - returned_amount, quantity - returned_quantity).
-- Only ADD COLUMN / CREATE TABLE here, no table rebuild (see 0014 for why).

ALTER TABLE sales ADD COLUMN returned_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;
-- Cost of goods that went back on the shelf (damaged goods stay in cost: they are a loss).
ALTER TABLE sales ADD COLUMN returned_cost DECIMAL(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';

-- Quantity returned, in the unit the line was sold in.
ALTER TABLE sale_items ADD COLUMN returned_quantity REAL NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS sale_returns (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    kind TEXT NOT NULL CHECK(kind IN ('void', 'return')),
    reason TEXT NOT NULL,
    -- value of the goods taken back
    total_amount DECIMAL(10, 2) NOT NULL,
    -- part of it that cancelled debt the customer still owed on this sale
    debt_reduced DECIMAL(10, 2) NOT NULL DEFAULT 0,
    -- part of it paid back to the customer
    refund_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    refund_method TEXT CHECK(refund_method IN ('cash', 'pos', 'transfer')),
    employee_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_return_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    sale_return_id TEXT NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE ON UPDATE CASCADE,
    sale_item_id TEXT NOT NULL REFERENCES sale_items(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    base_quantity REAL NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    -- 1 = went back on the shelf, 0 = written off (damaged/expired)
    restocked INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sale_returns_sale_id ON sale_returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_returns_created_at ON sale_returns(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_return_items_return_id ON sale_return_items(sale_return_id);
