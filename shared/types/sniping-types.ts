// Sniping Bot Types - Based on the new strategy document

// =============================================================================
// TypeScript Types for Sniping Bot
// =============================================================================

export type ListingStatus = 'PENDING' | 'READY' | 'SNIPED' | 'MISSED';
export type SnipeStatus = 'EXECUTED' | 'FAILED' | 'TIMED_OUT';
export type Side = 'BUY' | 'SELL';

export interface Listing {
  vcoinId: string;
  symbol: string;
  projectName?: string;
  scheduledLaunchTime: Date;
  discoveredAt: Date;
  status: ListingStatus;
}

export interface Target {
  symbol: string;
  vcoinId: string;
  projectName?: string;
  launchTime: Date;
  priceScale: number;
  quantityScale: number;
  hoursAdvanceNotice: number;
  pattern: string;
  discoveredAt: Date;
}

export interface Snipe {
  id: number;
  targetSymbol: string;
  exchangeOrderId?: string;
  status: SnipeStatus;
  side: Side;
  executedAt: Date;
  requestedQty?: number;
  executedQty?: number;
  avgPrice?: number;
  pnl1m?: number;
  pnl5m?: number;
  pnl15m?: number;
  pnl1h?: number;
  notes?: string;
}

export interface PollingTier {
  name: string;
  minTimeUntilLaunch: number; // milliseconds
  maxTimeUntilLaunch: number; // milliseconds
  intervalMs: number;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

// Calendar Service Types
export interface MonitorCalendarRequest {
  hours?: number; // 1 hour to 1 week, default 24
}

export interface MonitorCalendarResponse {
  newListings: number;
  totalListings: number;
}

export interface GetPendingListingsResponse {
  listings: Listing[];
}

export interface CalendarListing {
  vcoin_id: string;
  symbol: string;
  project_name?: string;
  scheduled_launch_time: string; // ISO string
}

// Detector Service Types
export interface StartAdaptiveDetectionResponse {
  message: string;
  activeTiers: string[];
}

export interface DetectReadyStatesResponse {
  newTargets: number;
}

// Executor Service Types
export interface ExecuteSnipeRequest {
  symbol: string;
  quantity: number;
  side?: 'BUY' | 'SELL';
  bufferMs?: number; // default 500ms buffer before launch
}

export interface ExecuteSnipeResponse {
  success: boolean;
  orderId?: string;
  error?: string;
  executionTime: number;
}

export interface TradeExecutionResult {
  orderId: string;
  executedQty: number;
  avgPrice: number;
}

// Tracker Service Types
export interface StartPositionTrackingRequest {
  snipeId: number;
}

export interface StartPositionTrackingResponse {
  message: string;
}

export interface UpdatePnLRequest {
  snipeId: number;
  currentPrice: number;
  timeframe: '1m' | '5m' | '15m' | '1h';
}

export interface UpdatePnLResponse {
  pnl: number;
}

export interface PerformanceAnalyticsResponse {
  totalSnipes: number;
  successRate: number;
  avgPnL1m: number;
  avgPnL5m: number;
  avgPnL15m: number;
  avgPnL1h: number;
  bestPerformer: {
    target_symbol: string;
    pnl_1h: number;
  } | null;
  worstPerformer: {
    target_symbol: string;
    pnl_1h: number;
  } | null;
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface SnipingConfig {
  calendar: {
    monitoringIntervalMs: number;
    defaultHours: number;
    maxHours: number;
  };
  detector: {
    pollingTiers: PollingTier[];
    symbolUpdateIntervalMs: number;
  };
  executor: {
    defaultBufferMs: number;
    maxExecutionTimeMs: number;
    retryAttempts: number;
  };
  tracker: {
    priceUpdateIntervals: {
      '1m': number;
      '5m': number;
      '15m': number;
      '1h': number;
    };
    websocketReconnectIntervalMs: number;
  };
}

// =============================================================================
// Database Row Types (matching SQL schema)
// =============================================================================

export interface ListingRow {
  vcoin_id: string;
  symbol: string;
  project_name?: string;
  scheduled_launch_time: Date;
  discovered_at: Date;
  status: ListingStatus;
}

export interface TargetRow {
  symbol: string;
  vcoin_id: string;
  project_name?: string;
  launch_time: Date;
  price_scale: number;
  quantity_scale: number;
  hours_advance_notice: number;
  pattern: string;
  discovered_at: Date;
}

export interface SnipeRow {
  id: number;
  target_symbol: string;
  exchange_order_id?: string;
  status: SnipeStatus;
  side: Side;
  executed_at: Date;
  requested_qty?: number;
  executed_qty?: number;
  avg_price?: number;
  pnl_1m?: number;
  pnl_5m?: number;
  pnl_15m?: number;
  pnl_1h?: number;
  notes?: string;
}

// =============================================================================
// Error Types
// =============================================================================

export class SnipingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SnipingError';
  }
}

export class CalendarError extends SnipingError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CALENDAR_ERROR', details);
    this.name = 'CalendarError';
  }
}

export class DetectorError extends SnipingError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DETECTOR_ERROR', details);
    this.name = 'DetectorError';
  }
}

export class ExecutorError extends SnipingError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'EXECUTOR_ERROR', details);
    this.name = 'ExecutorError';
  }
}

export class TrackerError extends SnipingError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'TRACKER_ERROR', details);
    this.name = 'TrackerError';
  }
}

// =============================================================================
// Utility Types
// =============================================================================

export interface SnipingServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  serviceName: string;
}

export type TimeFrame = '1m' | '5m' | '15m' | '1h';

export interface PnLSnapshot {
  timeframe: TimeFrame;
  pnl: number;
  timestamp: Date;
}

export interface MarketSymbolInfo {
  symbol: string;
  priceScale: number;
  quantityScale: number;
  isActive: boolean;
  lastUpdate: Date;
}

// =============================================================================
// Constants
// =============================================================================

export const DEFAULT_POLLING_TIERS: PollingTier[] = [
  {
    name: 'DISTANT',
    minTimeUntilLaunch: 60 * 60 * 1000, // 1 hour
    maxTimeUntilLaunch: Number.POSITIVE_INFINITY,
    intervalMs: 5 * 60 * 1000, // 5 minutes
  },
  {
    name: 'APPROACHING',
    minTimeUntilLaunch: 10 * 60 * 1000, // 10 minutes
    maxTimeUntilLaunch: 60 * 60 * 1000, // 1 hour
    intervalMs: 30 * 1000, // 30 seconds
  },
  {
    name: 'IMMINENT',
    minTimeUntilLaunch: 0,
    maxTimeUntilLaunch: 10 * 60 * 1000, // 10 minutes
    intervalMs: 2 * 1000, // 2 seconds
  },
];

export const DEFAULT_SNIPING_CONFIG: SnipingConfig = {
  calendar: {
    monitoringIntervalMs: 60 * 60 * 1000, // 1 hour
    defaultHours: 24,
    maxHours: 168, // 1 week
  },
  detector: {
    pollingTiers: DEFAULT_POLLING_TIERS,
    symbolUpdateIntervalMs: 30 * 1000, // 30 seconds
  },
  executor: {
    defaultBufferMs: 500,
    maxExecutionTimeMs: 10 * 1000, // 10 seconds safety
    retryAttempts: 3,
  },
  tracker: {
    priceUpdateIntervals: {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
    },
    websocketReconnectIntervalMs: 5 * 1000,
  },
};
