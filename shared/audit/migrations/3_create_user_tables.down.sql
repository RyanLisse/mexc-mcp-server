-- Drop user management tables in reverse order
DROP INDEX IF EXISTS idx_user_trades_snipe;
DROP INDEX IF EXISTS idx_user_trades_executed_at;
DROP INDEX IF EXISTS idx_user_trades_symbol;
DROP INDEX IF EXISTS idx_user_trades_user_id;
DROP INDEX IF EXISTS idx_user_sniping_targets_active;
DROP INDEX IF EXISTS idx_user_sniping_targets_user_id;
DROP INDEX IF EXISTS idx_user_sessions_expires_at;
DROP INDEX IF EXISTS idx_user_sessions_user_id;
DROP INDEX IF EXISTS idx_user_sessions_token;
DROP INDEX IF EXISTS idx_user_credentials_user_id;
DROP INDEX IF EXISTS idx_users_email;

DROP TABLE IF EXISTS user_trades;
DROP TABLE IF EXISTS user_sniping_targets;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS user_credentials;
DROP TABLE IF EXISTS users;