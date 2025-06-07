-- migrations/002_create_sniping_tables.up.sql

-- Table to store upcoming listings from the calendar
CREATE TABLE IF NOT EXISTS listings (
    vcoin_id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    project_name TEXT,
    scheduled_launch_time TIMESTAMPTZ NOT NULL,
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'READY', 'SNIPED', 'MISSED'))
);

-- Table to store detailed snipe targets once they are in the "ready" state
CREATE TABLE IF NOT EXISTS targets (
    symbol TEXT PRIMARY KEY,
    vcoin_id TEXT NOT NULL REFERENCES listings(vcoin_id),
    project_name TEXT,
    launch_time TIMESTAMPTZ NOT NULL,
    price_scale INTEGER,
    quantity_scale INTEGER,
    hours_advance_notice REAL,
    pattern TEXT,
    discovered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to log every snipe attempt and its result
CREATE TABLE IF NOT EXISTS snipes (
    id SERIAL PRIMARY KEY,
    target_symbol TEXT NOT NULL REFERENCES targets(symbol),
    exchange_order_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('EXECUTED', 'FAILED', 'TIMED_OUT')),
    side TEXT NOT NULL DEFAULT 'BUY' CHECK (side IN ('BUY', 'SELL')),
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    requested_qty DECIMAL,
    executed_qty DECIMAL,
    avg_price DECIMAL,
    pnl_1m DECIMAL,
    pnl_5m DECIMAL,
    pnl_15m DECIMAL,
    pnl_1h DECIMAL,
    notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_launch_time ON listings(scheduled_launch_time);
CREATE INDEX IF NOT EXISTS idx_targets_launch_time ON targets(launch_time);
CREATE INDEX IF NOT EXISTS idx_snipes_target_symbol ON snipes(target_symbol);
CREATE INDEX IF NOT EXISTS idx_snipes_executed_at ON snipes(executed_at);
CREATE INDEX IF NOT EXISTS idx_snipes_status ON snipes(status);
CREATE INDEX IF NOT EXISTS idx_listings_vcoin_id ON listings(vcoin_id);
CREATE INDEX IF NOT EXISTS idx_targets_vcoin_id ON targets(vcoin_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_listings_status_launch_time ON listings(status, scheduled_launch_time);
CREATE INDEX IF NOT EXISTS idx_snipes_target_executed ON snipes(target_symbol, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_snipes_status_executed ON snipes(status, executed_at DESC);