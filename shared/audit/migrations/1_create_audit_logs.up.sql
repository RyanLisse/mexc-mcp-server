-- Create audit_logs table for comprehensive API operation logging
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id VARCHAR(255),
    api_key VARCHAR(255) NOT NULL,
    operation VARCHAR(255) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    request_data JSONB,
    response_status INTEGER NOT NULL,
    response_data JSONB,
    error_message TEXT,
    duration_ms INTEGER NOT NULL,
    ip_address INET,
    user_agent TEXT,
    
    -- Indexes for common queries
    CONSTRAINT audit_logs_response_status_check CHECK (response_status >= 100 AND response_status < 600),
    CONSTRAINT audit_logs_duration_ms_check CHECK (duration_ms >= 0)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_api_key ON audit_logs (api_key);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs (operation);
CREATE INDEX IF NOT EXISTS idx_audit_logs_endpoint ON audit_logs (endpoint);
CREATE INDEX IF NOT EXISTS idx_audit_logs_response_status ON audit_logs (response_status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id) WHERE user_id IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_api_key_timestamp ON audit_logs (api_key, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_timestamp ON audit_logs (operation, timestamp DESC);