-- Create price history table for tracking product price changes
CREATE TABLE IF NOT EXISTS product_price_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    old_cost_price DECIMAL(10, 2),
    new_cost_price DECIMAL(10, 2),
    old_selling_price DECIMAL(10, 2),
    new_selling_price DECIMAL(10, 2),
    change_reason TEXT,
    changed_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON product_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON product_price_history(created_at);