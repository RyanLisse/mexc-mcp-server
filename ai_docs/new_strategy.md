# 🎯 Encore.dev TypeScript Sniping Bot Implementation

## 📁 Project Structure

```
sniping-bot/
├── services/
│   ├── calendar/          # Strategy 1: Calendar monitoring
│   ├── detector/          # Strategy 2: Adaptive polling & detection
│   ├── executor/          # Strategy 2: High-precision execution
│   └── tracker/           # Strategy 3: Post-snipe tracking
├── pkg/
│   ├── database/          # Database schemas & migrations
│   ├── mexc/             # MEXC API client
│   └── types/            # Shared TypeScript types
└── encore.app
```

## 🗄️ Database Schema (PostgreSQL)

```sql
-- migrations/001_create_sniping_tables.up.sql

-- Table to store upcoming listings from the calendar
CREATE TABLE listings (
    vcoin_id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    project_name TEXT,
    scheduled_launch_time TIMESTAMPTZ NOT NULL,
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'READY', 'SNIPED', 'MISSED'))
);

-- Table to store detailed snipe targets once they are in the "ready" state
CREATE TABLE targets (
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
CREATE TABLE snipes (
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
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_launch_time ON listings(scheduled_launch_time);
CREATE INDEX idx_targets_launch_time ON targets(launch_time);
CREATE INDEX idx_snipes_target_symbol ON snipes(target_symbol);
CREATE INDEX idx_snipes_executed_at ON snipes(executed_at);
```

## 📦 Shared Types

```typescript
// pkg/types/sniping.ts
import { z } from "zod";

export const ListingStatusSchema = z.enum(['PENDING', 'READY', 'SNIPED', 'MISSED']);
export const SnipeStatusSchema = z.enum(['EXECUTED', 'FAILED', 'TIMED_OUT']);
export const SideSchema = z.enum(['BUY', 'SELL']);

export const ListingSchema = z.object({
  vcoinId: z.string(),
  symbol: z.string(),
  projectName: z.string().optional(),
  scheduledLaunchTime: z.date(),
  discoveredAt: z.date(),
  status: ListingStatusSchema,
});

export const TargetSchema = z.object({
  symbol: z.string(),
  vcoinId: z.string(),
  projectName: z.string().optional(),
  launchTime: z.date(),
  priceScale: z.number().int(),
  quantityScale: z.number().int(),
  hoursAdvanceNotice: z.number(),
  pattern: z.string(),
  discoveredAt: z.date(),
});

export const SnipeSchema = z.object({
  id: z.number(),
  targetSymbol: z.string(),
  exchangeOrderId: z.string().optional(),
  status: SnipeStatusSchema,
  side: SideSchema,
  executedAt: z.date(),
  requestedQty: z.number().optional(),
  executedQty: z.number().optional(),
  avgPrice: z.number().optional(),
  pnl1m: z.number().optional(),
  pnl5m: z.number().optional(),
  pnl15m: z.number().optional(),
  pnl1h: z.number().optional(),
  notes: z.string().optional(),
});

export type Listing = z.infer<typeof ListingSchema>;
export type Target = z.infer<typeof TargetSchema>;
export type Snipe = z.infer<typeof SnipeSchema>;

export const PollingTierSchema = z.object({
  name: z.string(),
  minTimeUntilLaunch: z.number(), // milliseconds
  maxTimeUntilLaunch: z.number(), // milliseconds
  intervalMs: z.number(),
});

export type PollingTier = z.infer<typeof PollingTierSchema>;
```

## 🎯 Strategy 1: Calendar Service (Persistent State Management)

```typescript
// services/calendar/calendar.ts
import { api, Query } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { z } from "zod";
import type { Listing } from "../../pkg/types/sniping";

const db = new SQLDatabase("sniping", {
  migrations: "./migrations",
});

const MonitorCalendarRequestSchema = z.object({
  hours: z.number().min(1).max(168).default(24), // 1 hour to 1 week
});

const CalendarListingSchema = z.object({
  vcoin_id: z.string(),
  symbol: z.string(),
  project_name: z.string().optional(),
  scheduled_launch_time: z.string(), // ISO string
});

/**
 * Monitors the MEXC calendar for new listings and persists them to database
 */
export const monitorCalendar = api(
  { method: "POST", path: "/calendar/monitor" },
  async (req: z.infer<typeof MonitorCalendarRequestSchema>): Promise<{
    newListings: number;
    totalListings: number;
  }> => {
    const { hours } = MonitorCalendarRequestSchema.parse(req);
    
    // Fetch calendar data from MEXC API
    const calendarData = await fetchMexcCalendar(hours);
    
    let newListings = 0;
    
    for (const listing of calendarData) {
      const result = await db.exec`
        INSERT INTO listings (vcoin_id, symbol, project_name, scheduled_launch_time)
        VALUES (${listing.vcoin_id}, ${listing.symbol}, ${listing.project_name}, ${listing.scheduled_launch_time})
        ON CONFLICT (vcoin_id) DO NOTHING
        RETURNING vcoin_id
      `;
      
      if (result.rowCount > 0) {
        newListings++;
      }
    }
    
    const totalResult = await db.queryRow`
      SELECT COUNT(*) as total FROM listings WHERE status = 'PENDING'
    `;
    
    return {
      newListings,
      totalListings: totalResult.total,
    };
  }
);

/**
 * Get all pending listings from database
 */
export const getPendingListings = api(
  { method: "GET", path: "/calendar/pending" },
  async (): Promise<{ listings: Listing[] }> => {
    const rows = await db.query`
      SELECT vcoin_id, symbol, project_name, scheduled_launch_time, discovered_at, status
      FROM listings 
      WHERE status = 'PENDING'
      ORDER BY scheduled_launch_time ASC
    `;
    
    const listings = rows.map(row => ({
      vcoinId: row.vcoin_id,
      symbol: row.symbol,
      projectName: row.project_name,
      scheduledLaunchTime: new Date(row.scheduled_launch_time),
      discoveredAt: new Date(row.discovered_at),
      status: row.status,
    }));
    
    return { listings };
  }
);

async function fetchMexcCalendar(hours: number): Promise<z.infer<typeof CalendarListingSchema>[]> {
  // Implementation would call MEXC calendar API
  // This is a placeholder - implement actual MEXC API call
  return [];
}

// Cron job to automatically monitor calendar every hour
export const { scheduleCalendarMonitor } = (() => {
  return {
    scheduleCalendarMonitor: () => {
      // Encore.dev cron job
      // This would be configured in encore.app or through Encore's scheduling
    }
  };
})();
```

## 🔍 Strategy 2: Detector Service (Adaptive Polling)

```typescript
// services/detector/detector.ts
import { api, Query } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { z } from "zod";
import type { PollingTier, Target } from "../../pkg/types/sniping";

const db = new SQLDatabase("sniping", {
  migrations: "./migrations",
});

// Define polling tiers for adaptive monitoring
const POLLING_TIERS: PollingTier[] = [
  {
    name: "DISTANT",
    minTimeUntilLaunch: 60 * 60 * 1000, // 1 hour
    maxTimeUntilLaunch: Infinity,
    intervalMs: 5 * 60 * 1000, // 5 minutes
  },
  {
    name: "APPROACHING", 
    minTimeUntilLaunch: 10 * 60 * 1000, // 10 minutes
    maxTimeUntilLaunch: 60 * 60 * 1000, // 1 hour
    intervalMs: 30 * 1000, // 30 seconds
  },
  {
    name: "IMMINENT",
    minTimeUntilLaunch: 0,
    maxTimeUntilLaunch: 10 * 60 * 1000, // 10 minutes  
    intervalMs: 2 * 1000, // 2 seconds
  },
];

/**
 * Adaptive detector that monitors based on urgency
 */
export const startAdaptiveDetection = api(
  { method: "POST", path: "/detector/start" },
  async (): Promise<{ message: string; activeTiers: string[] }> => {
    const pendingListings = await db.query`
      SELECT vcoin_id, symbol, scheduled_launch_time
      FROM listings 
      WHERE status = 'PENDING'
    `;
    
    const activeTiers: string[] = [];
    
    for (const listing of pendingListings) {
      const timeUntilLaunch = new Date(listing.scheduled_launch_time).getTime() - Date.now();
      const tier = POLLING_TIERS.find(t => 
        timeUntilLaunch >= t.minTimeUntilLaunch && timeUntilLaunch < t.maxTimeUntilLaunch
      );
      
      if (tier && !activeTiers.includes(tier.name)) {
        activeTiers.push(tier.name);
        // Start monitoring for this tier
        startTierMonitoring(tier, pendingListings.filter(l => {
          const tul = new Date(l.scheduled_launch_time).getTime() - Date.now();
          return tul >= tier.minTimeUntilLaunch && tul < tier.maxTimeUntilLaunch;
        }));
      }
    }
    
    return {
      message: `Started adaptive detection for ${pendingListings.length} listings`,
      activeTiers,
    };
  }
);

/**
 * Check for ready states and move to targets table
 */
export const detectReadyStates = api(
  { method: "POST", path: "/detector/check-ready" },
  async (): Promise<{ newTargets: number }> => {
    const pendingListings = await db.query`
      SELECT vcoin_id, symbol, scheduled_launch_time
      FROM listings 
      WHERE status = 'PENDING'
    `;
    
    let newTargets = 0;
    
    // Get current symbols from MEXC
    const mexcSymbols = await fetchMexcSymbols();
    
    for (const listing of pendingListings) {
      const isReady = await checkIfTokenReady(listing.symbol, mexcSymbols);
      
      if (isReady) {
        const symbolInfo = mexcSymbols.find(s => s.symbol === listing.symbol);
        if (symbolInfo) {
          // Insert into targets table
          await db.exec`
            INSERT INTO targets (
              symbol, vcoin_id, project_name, launch_time, 
              price_scale, quantity_scale, hours_advance_notice, pattern
            ) VALUES (
              ${listing.symbol}, ${listing.vcoin_id}, ${listing.project_name || ''}, 
              ${listing.scheduled_launch_time}, ${symbolInfo.priceScale}, 
              ${symbolInfo.quantityScale}, ${calculateAdvanceNotice(listing.scheduled_launch_time)}, 
              ${generatePattern(symbolInfo)}
            )
            ON CONFLICT (symbol) DO NOTHING
          `;
          
          // Update listing status
          await db.exec`
            UPDATE listings SET status = 'READY' WHERE vcoin_id = ${listing.vcoin_id}
          `;
          
          newTargets++;
        }
      }
    }
    
    return { newTargets };
  }
);

async function startTierMonitoring(tier: PollingTier, listings: any[]) {
  // Implementation for tier-specific monitoring
  // Would use Encore's background tasks or workers
}

async function fetchMexcSymbols(): Promise<any[]> {
  // Implementation to fetch from MEXC symbolsV2 endpoint
  return [];
}

async function checkIfTokenReady(symbol: string, mexcSymbols: any[]): Promise<boolean> {
  // Pattern matching logic from original implementation
  return mexcSymbols.some(s => s.symbol === symbol);
}

function calculateAdvanceNotice(launchTime: string): number {
  return (Date.now() - new Date(launchTime).getTime()) / (1000 * 60 * 60);
}

function generatePattern(symbolInfo: any): string {
  return `sts:${symbolInfo.priceScale},st:${symbolInfo.priceScale},tt:${symbolInfo.quantityScale}`;
}
```

## ⚡ Strategy 2: Executor Service (High-Precision Execution)

```typescript
// services/executor/executor.ts
import { api } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { z } from "zod";

const db = new SQLDatabase("sniping", {
  migrations: "./migrations",
});

const ExecuteSnipeRequestSchema = z.object({
  symbol: z.string(),
  quantity: z.number().positive(),
  side: z.enum(['BUY', 'SELL']).default('BUY'),
  bufferMs: z.number().default(500), // 500ms buffer before launch
});

/**
 * High-precision execution service
 */
export const executeSnipe = api(
  { method: "POST", path: "/executor/snipe" },
  async (req: z.infer<typeof ExecuteSnipeRequestSchema>): Promise<{
    success: boolean;
    orderId?: string;
    error?: string;
    executionTime: number;
  }> => {
    const { symbol, quantity, side, bufferMs } = ExecuteSnipeRequestSchema.parse(req);
    
    // Get target info
    const target = await db.queryRow`
      SELECT * FROM targets WHERE symbol = ${symbol}
    `;
    
    if (!target) {
      throw new Error(`Target not found: ${symbol}`);
    }
    
    const launchTime = new Date(target.launch_time).getTime();
    const currentTime = Date.now();
    const timeUntilLaunch = launchTime - currentTime;
    
    // High-precision timing
    if (timeUntilLaunch > bufferMs) {
      const sleepDuration = timeUntilLaunch - bufferMs;
      await sleep(sleepDuration);
    }
    
    // Spin loop for precise timing
    const startSpin = Date.now();
    while (Date.now() < launchTime) {
      // Tight loop - exit when launch time reached
      if (Date.now() - startSpin > 10000) { // 10s safety break
        break;
      }
    }
    
    const executionStart = performance.now();
    
    try {
      // Execute the actual trade
      const result = await executeTrade(symbol, quantity, side);
      const executionTime = performance.now() - executionStart;
      
      // Log to database
      await db.exec`
        INSERT INTO snipes (
          target_symbol, exchange_order_id, status, side, 
          requested_qty, executed_qty, avg_price
        ) VALUES (
          ${symbol}, ${result.orderId}, 'EXECUTED', ${side},
          ${quantity}, ${result.executedQty}, ${result.avgPrice}
        )
      `;
      
      return {
        success: true,
        orderId: result.orderId,
        executionTime,
      };
      
    } catch (error) {
      const executionTime = performance.now() - executionStart;
      
      // Log failed attempt
      await db.exec`
        INSERT INTO snipes (target_symbol, status, side, requested_qty, notes)
        VALUES (${symbol}, 'FAILED', ${side}, ${quantity}, ${error.message})
      `;
      
      return {
        success: false,
        error: error.message,
        executionTime,
      };
    }
  }
);

async function executeTrade(symbol: string, quantity: number, side: string) {
  // Implementation using MEXC API client
  // This would call the actual MEXC trading endpoint
  return {
    orderId: `mock_${Date.now()}`,
    executedQty: quantity,
    avgPrice: 1.0,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 📊 Strategy 3: Tracker Service (Post-Snipe P&L)

```typescript
// services/tracker/tracker.ts
import { api } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { z } from "zod";

const db = new SQLDatabase("sniping", {
  migrations: "./migrations",
});

/**
 * Start tracking a position after successful snipe
 */
export const startPositionTracking = api(
  { method: "POST", path: "/tracker/start" },
  async (req: { snipeId: number }): Promise<{ message: string }> => {
    const { snipeId } = req;
    
    const snipe = await db.queryRow`
      SELECT * FROM snipes WHERE id = ${snipeId} AND status = 'EXECUTED'
    `;
    
    if (!snipe) {
      throw new Error("Executed snipe not found");
    }
    
    // Start WebSocket monitoring for the symbol
    await startPriceMonitoring(snipe.target_symbol, snipe.avg_price, snipeId);
    
    return { message: `Started tracking position for ${snipe.target_symbol}` };
  }
);

/**
 * Update P&L for a specific timeframe
 */
export const updatePnL = api(
  { method: "POST", path: "/tracker/update-pnl" },
  async (req: {
    snipeId: number;
    currentPrice: number;
    timeframe: '1m' | '5m' | '15m' | '1h';
  }): Promise<{ pnl: number }> => {
    const { snipeId, currentPrice, timeframe } = req;
    
    const snipe = await db.queryRow`
      SELECT * FROM snipes WHERE id = ${snipeId}
    `;
    
    if (!snipe) {
      throw new Error("Snipe not found");
    }
    
    const entryPrice = parseFloat(snipe.avg_price);
    const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    const columnName = `pnl_${timeframe}`;
    
    await db.exec`
      UPDATE snipes 
      SET ${columnName} = ${pnlPercent}
      WHERE id = ${snipeId}
    `;
    
    return { pnl: pnlPercent };
  }
);

/**
 * Get performance analytics for all snipes
 */
export const getPerformanceAnalytics = api(
  { method: "GET", path: "/tracker/analytics" },
  async (): Promise<{
    totalSnipes: number;
    successRate: number;
    avgPnL1m: number;
    avgPnL5m: number;
    avgPnL15m: number;
    avgPnL1h: number;
    bestPerformer: any;
    worstPerformer: any;
  }> => {
    const analytics = await db.queryRow`
      SELECT 
        COUNT(*) as total_snipes,
        COUNT(CASE WHEN status = 'EXECUTED' THEN 1 END) as executed_snipes,
        AVG(pnl_1m) as avg_pnl_1m,
        AVG(pnl_5m) as avg_pnl_5m,
        AVG(pnl_15m) as avg_pnl_15m,
        AVG(pnl_1h) as avg_pnl_1h
      FROM snipes
    `;
    
    const bestPerformer = await db.queryRow`
      SELECT target_symbol, pnl_1h 
      FROM snipes 
      WHERE pnl_1h IS NOT NULL 
      ORDER BY pnl_1h DESC 
      LIMIT 1
    `;
    
    const worstPerformer = await db.queryRow`
      SELECT target_symbol, pnl_1h 
      FROM snipes 
      WHERE pnl_1h IS NOT NULL 
      ORDER BY pnl_1h ASC 
      LIMIT 1
    `;
    
    return {
      totalSnipes: analytics.total_snipes,
      successRate: (analytics.executed_snipes / analytics.total_snipes) * 100,
      avgPnL1m: analytics.avg_pnl_1m || 0,
      avgPnL5m: analytics.avg_pnl_5m || 0,
      avgPnL15m: analytics.avg_pnl_15m || 0,
      avgPnL1h: analytics.avg_pnl_1h || 0,
      bestPerformer,
      worstPerformer,
    };
  }
);

async function startPriceMonitoring(symbol: string, entryPrice: number, snipeId: number) {
  // Implementation would use WebSocket to monitor real-time prices
  // and trigger P&L updates at specified intervals
  
  // Schedule P&L updates
  setTimeout(() => updatePnLFromPrice(snipeId, '1m'), 60 * 1000);
  setTimeout(() => updatePnLFromPrice(snipeId, '5m'), 5 * 60 * 1000);
  setTimeout(() => updatePnLFromPrice(snipeId, '15m'), 15 * 60 * 1000);
  setTimeout(() => updatePnLFromPrice(snipeId, '1h'), 60 * 60 * 1000);
}

async function updatePnLFromPrice(snipeId: number, timeframe: string) {
  // Get current price and update P&L
  // This would call the updatePnL API internally
}
```

## 🚀 Main Application Configuration

```typescript
// encore.app
{
  "id": "sniping-bot",
  "databases": [
    {
      "name": "sniping",
      "engine": "postgresql"
    }
  ],
  "services": [
    "calendar",
    "detector", 
    "executor",
    "tracker"
  ]
}
```

## 🏗️ Key Encore.dev Benefits

1. **Type Safety**: Full TypeScript with Zod validation
2. **Database**: Built-in PostgreSQL with migrations
3. **API Generation**: Automatic API documentation and client generation
4. **Observability**: Built-in metrics, logging, and tracing
5. **Deployment**: Seamless cloud deployment
6. **Testing**: Integrated testing framework
7. **Background Jobs**: For cron scheduling and async tasks

## 📋 Implementation Checklist

- [ ] Set up Encore.dev project structure
- [ ] Implement database migrations
- [ ] Create MEXC API client integration
- [ ] Build calendar monitoring service
- [ ] Implement adaptive polling system
- [ ] Create high-precision executor
- [ ] Build WebSocket price tracking
- [ ] Add comprehensive error handling
- [ ] Implement proper logging/observability
- [ ] Create unit and integration tests
- [ ] Set up CI/CD pipeline

This refactored implementation leverages Encore.dev's strengths while maintaining the sophisticated trading bot functionality from your original strategies.