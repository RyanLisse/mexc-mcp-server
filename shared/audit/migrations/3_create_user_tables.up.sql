-- User management and credential storage
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise'))
);

-- Encrypted MEXC credentials per user
CREATE TABLE IF NOT EXISTS user_credentials (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    mexc_api_key_encrypted TEXT NOT NULL,
    mexc_secret_key_encrypted TEXT NOT NULL,
    encryption_key_id TEXT NOT NULL, -- Reference to encryption key
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    UNIQUE(user_id, is_active) -- Only one active credential per user
);

-- User trading sessions for rate limiting and monitoring
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- User-specific sniping targets
CREATE TABLE IF NOT EXISTS user_sniping_targets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    target_symbol TEXT NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    max_price DECIMAL(20, 8),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_symbol, is_active)
);

-- User trading history
CREATE TABLE IF NOT EXISTS user_trades (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    exchange_order_id TEXT,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    total_value DECIMAL(20, 8) NOT NULL,
    fees DECIMAL(20, 8) DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'FILLED', 'CANCELLED', 'FAILED')),
    executed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    pnl_1m DECIMAL(20, 8),
    pnl_5m DECIMAL(20, 8),
    pnl_15m DECIMAL(20, 8),
    pnl_1h DECIMAL(20, 8),
    is_snipe BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_credentials_user_id ON user_credentials(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sniping_targets_user_id ON user_sniping_targets(user_id);
CREATE INDEX idx_user_sniping_targets_active ON user_sniping_targets(is_active);
CREATE INDEX idx_user_trades_user_id ON user_trades(user_id);
CREATE INDEX idx_user_trades_symbol ON user_trades(symbol);
CREATE INDEX idx_user_trades_executed_at ON user_trades(executed_at);
CREATE INDEX idx_user_trades_snipe ON user_trades(is_snipe);