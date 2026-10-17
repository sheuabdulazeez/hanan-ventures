-- Track whether a user must change their password before using the app.
-- Used to force rotation of the seeded default super-admin credentials.
ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0;
