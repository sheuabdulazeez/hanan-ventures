-- First add the new columns
ALTER TABLE sale_items ADD COLUMN cost_price_at_sale DECIMAL(10, 2);
ALTER TABLE sale_items ADD COLUMN profit DECIMAL(10, 2);
ALTER TABLE sales ADD COLUMN total_cost DECIMAL(10, 2);
ALTER TABLE sales ADD COLUMN gross_profit DECIMAL(10, 2);

-- Update existing sale_items with cost prices and profits
UPDATE sale_items 
SET cost_price_at_sale = (
    SELECT cost_price 
    FROM products 
    WHERE products.id = sale_items.product_id
),
profit = (quantity * unit_price) - (quantity * (
    SELECT cost_price 
    FROM products 
    WHERE products.id = sale_items.product_id
));

-- Update sales table with total costs and gross profits
UPDATE sales 
SET total_cost = (
    SELECT COALESCE(SUM(cost_price_at_sale * quantity), 0)
    FROM sale_items
    WHERE sale_items.sale_id = sales.id
),
gross_profit = total_amount - (
    SELECT COALESCE(SUM(cost_price_at_sale * quantity), 0)
    FROM sale_items
    WHERE sale_items.sale_id = sales.id
) - COALESCE(discount, 0);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);