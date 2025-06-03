-- Drop audit_logs table and related indexes
DROP INDEX IF EXISTS idx_audit_logs_operation_timestamp;
DROP INDEX IF EXISTS idx_audit_logs_api_key_timestamp;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_response_status;
DROP INDEX IF EXISTS idx_audit_logs_endpoint;
DROP INDEX IF EXISTS idx_audit_logs_operation;
DROP INDEX IF EXISTS idx_audit_logs_api_key;
DROP INDEX IF EXISTS idx_audit_logs_timestamp;

DROP TABLE IF EXISTS audit_logs;