-- Applied to existing D1 databases; new installs use schema.sql with client_ip included.
ALTER TABLE conversations ADD COLUMN client_ip TEXT;
