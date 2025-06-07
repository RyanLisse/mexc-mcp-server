-- migrations/002_create_sniping_tables.down.sql

-- Drop tables in reverse order (to handle foreign key constraints)
DROP TABLE IF EXISTS snipes;
DROP TABLE IF EXISTS targets;
DROP TABLE IF EXISTS listings;