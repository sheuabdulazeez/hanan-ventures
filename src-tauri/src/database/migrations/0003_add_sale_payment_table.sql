-- Create new sale_payments table
CREATE TABLE IF NOT EXISTS sale_payments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE ON UPDATE CASCADE,
    payment_method TEXT CHECK(payment_method IN ('cash', 'pos', 'transfer')) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    bank_name TEXT,
    reference_number TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrate existing payment data
INSERT INTO sale_payments (
    sale_id,
    payment_method,
    amount,
    bank_name,
    created_at
)
    SELECT 
        id,
        payment_method,
        amount_paid,
        bank_name,
        created_at
    FROM sales
    WHERE payment_method IS NOT NULL
    AND amount_paid > 0;

-- Remove payment columns from sales table
ALTER TABLE sales DROP COLUMN payment_method;
ALTER TABLE sales DROP COLUMN bank_name;
ALTER TABLE sales DROP COLUMN amount_paid;