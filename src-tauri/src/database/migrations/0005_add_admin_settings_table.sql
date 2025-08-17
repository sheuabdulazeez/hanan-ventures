-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert a default row for settings if it doesn't exist
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('name', 'Hanan Ventures', 'Name of the business');
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('address', '123 Main St, Cityville', 'Business address');
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('city', 'Cityville', 'Business city');
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('state', 'Stateville', 'Business state');
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('zip_code', '12345', 'Business zip code');
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('phone', '123-456-7890', 'Business phone number');
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('email', 'info@hananventures.com', 'Business email address');
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('website', 'https://hananventures.com', 'Business website');
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('logo', 'logo.png', 'Business logo');
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('currency', 'NGN', 'Business currency');
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('currency_symbol', '₦', 'Business currency symbol');
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('compact', '1', 'Enable compact mode');
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('receipt_header', 'Thanks for shopping with us', 'Receipt header');
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('receipt_footer', 'Visit us again', 'Receipt footer');
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('date_format', 'YYYY-MM-DD', 'Date format');
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES ('time_format', 'HH:mm:ss', 'Time format');


