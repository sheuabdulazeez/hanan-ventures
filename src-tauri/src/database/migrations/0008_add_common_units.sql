-- Migration to add common units table

-- Common Units table
CREATE TABLE IF NOT EXISTS  common_units (
  id TEXT UNIQUE PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL,
  abbrev TEXT NOT NULL,
  related_units JSON,
  created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
  updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP)
);

-- Product Units table - stores units specific to products
CREATE TABLE IF NOT EXISTS product_units (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    unit_id TEXT NOT NULL REFERENCES common_units(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    conversion_to_base DECIMAL(10, 4) NOT NULL, -- How many of this unit = 1 base unit
    selling_price DECIMAL(10, 2) NOT NULL,
    is_primary INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, unit_id)
);

-- Add base_unit and display_unit columns to products table
ALTER TABLE products ADD COLUMN base_unit TEXT REFERENCES common_units(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add unit_used column to sale_items table
ALTER TABLE sale_items ADD COLUMN unit_used TEXT REFERENCES common_units(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE sale_items ADD COLUMN base_quantity DECIMAL(10, 4);


-- Insert some common units
INSERT INTO common_units (abbrev, name, related_units) VALUES
('kg', 'Kilogram', '[]'),
('g', 'Gram', json_array((SELECT id FROM common_units WHERE name = 'kg'))),
('L', 'Liter', '[]'),
('mL', 'Milliliter', json_array((SELECT id FROM common_units WHERE name = 'L'))),
('pc', 'Piece', '[]'),
('pk', 'Pack', json_array((SELECT id FROM common_units WHERE name = 'pc'))),
('ctn', 'Carton', json_array((SELECT id FROM common_units WHERE name = 'pk'), (SELECT id FROM common_units WHERE name = 'pc'))),
('dz', 'Dozen', json_array((SELECT id FROM common_units WHERE name = 'pc'))),
('bag', 'Bag', '[]'),
('btl', 'Bottle', '[]'),
('sct', 'Sachet', '[]'),
('box', 'Box', '[]');