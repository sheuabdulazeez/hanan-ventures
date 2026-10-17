-- Debt is now tracked per credit sale: every credit sale gets its own `debtors`
-- row instead of being merged into one open row per customer (which kept only
-- the first sale's id and lost the per-sale breakdown).
--
-- Only ADD COLUMN / CREATE INDEX here, deliberately no table rebuild:
-- debtor_payments.debtor_id is ON DELETE CASCADE, so DROP TABLE debtors with
-- foreign keys enabled would silently wipe the debt payment history.

-- Amount the sale originally put on credit (amount_owed is the remaining balance).
ALTER TABLE debtors ADD COLUMN original_amount DECIMAL(10, 2);

-- Backfill: remaining balance + everything already paid against the row.
UPDATE debtors
SET original_amount = amount_owed + COALESCE(
    (SELECT SUM(amount_paid) FROM debtor_payments WHERE debtor_payments.debtor_id = debtors.id),
    0
);

-- One customer payment can be spread over several sales (oldest first); the
-- resulting debtor_payments rows share a group id so it still reads as one receipt.
ALTER TABLE debtor_payments ADD COLUMN payment_group_id TEXT;
UPDATE debtor_payments SET payment_group_id = id WHERE payment_group_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_debtors_customer_open ON debtors(customer_id, is_paid);
CREATE INDEX IF NOT EXISTS idx_debtors_sale_id ON debtors(sale_id);
CREATE INDEX IF NOT EXISTS idx_debtor_payments_debtor_id ON debtor_payments(debtor_id);
CREATE INDEX IF NOT EXISTS idx_debtor_payments_group_id ON debtor_payments(payment_group_id);
