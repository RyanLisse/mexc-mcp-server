import { z } from 'zod';

// Core schemas for pattern sniper functionality
export const CalendarEntrySchema = z.object({
  vcoinId: z.string(),
  symbol: z.string(),
  projectName: z.string(),
  firstOpenTime: z.number(),
});

export const SymbolV2EntrySchema = z.object({
  cd: z.string(), // vcoinId
  ca: z.string().optional(), // contract address
  ps: z.number().optional(), // price scale
  qs: z.number().optional(), // quantity scale
  sts: z.number(), // symbol trading status
  st: z.number(), // state
  tt: z.number(), // trading type
  ot: z.number().optional(), // open time
});

export const SnipeTargetSchema = z.object({
  vcoinId: z.string(),
  symbol: z.string(),
  projectName: z.string(),
  priceDecimalPlaces: z.number(),
  quantityDecimalPlaces: z.number(),
  launchTime: z.date(),
  discoveredAt: z.date(),
  hoursAdvanceNotice: z.number(),
  orderParameters: z.object({
    symbol: z.string(),
    side: z.enum(['BUY', 'SELL']),
    type: z.enum(['MARKET', 'LIMIT']),
    quoteOrderQty: z.number().optional(),
    quantity: z.number().optional(),
    price: z.number().optional(),
  }),
});

// Pattern recognition constants
export const READY_STATE_PATTERN = {
  sts: 2, // symbol trading status
  st: 2, // state
  tt: 4, // trading type
} as const;

// Status tracking schemas
export const PatternSniperStatusSchema = z.object({
  isMonitoring: z.boolean(),
  totalListings: z.number(),
  pendingDetection: z.number(),
  readyToSnipe: z.number(),
  executed: z.number(),
  lastUpdate: z.date(),
  errors: z.array(z.string()),

  // Enhanced status information
  performance: z.object({
    successfulExecutions: z.number(),
    failedExecutions: z.number(),
    averageDetectionTimeMs: z.number(),
    averageExecutionTimeMs: z.number(),
    totalApiCalls: z.number(),
    failedApiCalls: z.number(),
  }),

  circuitBreakerStatus: z.object({
    isOpen: z.boolean(),
    failureCount: z.number(),
    lastFailureTime: z.date().optional(),
    nextAttemptTime: z.date().optional(),
  }),

  resourceUsage: z.object({
    activeIntervals: z.number(),
    memoryUsageMB: z.number(),
    queuedOperations: z.number(),
  }),
});

// Enhanced error tracking
export const ErrorEntrySchema = z.object({
  timestamp: z.date(),
  type: z.enum(['API_ERROR', 'EXECUTION_ERROR', 'VALIDATION_ERROR', 'TIMEOUT_ERROR']),
  message: z.string(),
  context: z.record(z.unknown()).optional(),
  retryCount: z.number().default(0),
  resolved: z.boolean().default(false),
});

// Performance metrics
export const PerformanceMetricsSchema = z.object({
  timestamp: z.date(),
  detectionLatencyMs: z.number(),
  executionLatencyMs: z.number(),
  apiResponseTimeMs: z.number(),
  memoryUsageMB: z.number(),
  cpuUsagePercent: z.number().optional(),
});

export const PatternSniperConfigSchema = z.object({
  defaultOrderAmount: z.number().min(1).default(100),
  maxPositionSize: z.number().min(1).default(1000),
  enableAutoExecution: z.boolean().default(false),
  calendarRefreshInterval: z
    .number()
    .min(1000)
    .default(5 * 60 * 1000), // 5 minutes
  symbolsRefreshInterval: z
    .number()
    .min(1000)
    .default(30 * 1000), // 30 seconds
  testMode: z.boolean().default(true),

  // Enhanced configuration for reliability and performance
  retryStrategy: z
    .object({
      maxRetries: z.number().min(0).max(10).default(3),
      initialDelayMs: z.number().min(100).default(1000),
      maxDelayMs: z.number().min(1000).default(30000),
      backoffMultiplier: z.number().min(1).max(10).default(2),
      jitterPercentage: z.number().min(0).max(1).default(0.1),
    })
    .default({}),

  circuitBreaker: z
    .object({
      failureThreshold: z.number().min(1).max(100).default(5),
      recoveryTimeoutMs: z.number().min(1000).default(60000),
      monitoringWindowMs: z.number().min(10000).default(300000), // 5 minutes
    })
    .default({}),

  timing: z
    .object({
      executionDelayMs: z.number().min(0).max(10000).default(100), // Delay before execution
      preExecutionBufferMs: z.number().min(0).max(60000).default(5000), // Buffer before launch time
      maxExecutionWindowMs: z.number().min(1000).max(300000).default(30000), // Max time to attempt execution
    })
    .default({}),

  rateLimiting: z
    .object({
      maxConcurrentRequests: z.number().min(1).max(100).default(5),
      requestsPerSecond: z.number().min(1).max(1000).default(10),
      burstSize: z.number().min(1).max(1000).default(20),
    })
    .default({}),

  monitoring: z
    .object({
      healthCheckIntervalMs: z.number().min(10000).default(60000), // 1 minute
      metricsRetentionHours: z.number().min(1).max(168).default(24), // Max 1 week
      enableDetailedLogging: z.boolean().default(false),
    })
    .default({}),
});

// API response schemas
export const CalendarResponseSchema = z.object({
  data: z.array(CalendarEntrySchema),
});

export const SymbolsV2ResponseSchema = z.object({
  data: z.object({
    symbols: z.array(SymbolV2EntrySchema),
  }),
});

// Explicit type definitions for Encore compatibility
export interface CalendarEntry {
  vcoinId: string;
  symbol: string;
  projectName: string;
  firstOpenTime: number;
}

export interface SymbolV2Entry {
  cd: string; // vcoinId
  ca?: string; // contract address
  ps?: number; // price scale
  qs?: number; // quantity scale
  sts: number; // symbol trading status
  st: number; // state
  tt: number; // trading type
  ot?: number; // open time
}

export interface SnipeTarget {
  vcoinId: string;
  symbol: string;
  projectName: string;
  priceDecimalPlaces: number;
  quantityDecimalPlaces: number;
  launchTime: Date;
  discoveredAt: Date;
  hoursAdvanceNotice: number;
  orderParameters: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    quoteOrderQty?: number;
    quantity?: number;
    price?: number;
  };
}

export interface PatternSniperStatus {
  isMonitoring: boolean;
  totalListings: number;
  pendingDetection: number;
  readyToSnipe: number;
  executed: number;
  lastUpdate: Date;
  errors: string[];
  performance: {
    successfulExecutions: number;
    failedExecutions: number;
    averageDetectionTimeMs: number;
    averageExecutionTimeMs: number;
    totalApiCalls: number;
    failedApiCalls: number;
  };
  circuitBreakerStatus: {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime?: Date;
    nextAttemptTime?: Date;
  };
  resourceUsage: {
    activeIntervals: number;
    memoryUsageMB: number;
    queuedOperations: number;
  };
}

export interface PatternSniperConfig {
  defaultOrderAmount: number;
  maxPositionSize: number;
  enableAutoExecution: boolean;
  calendarRefreshInterval: number;
  symbolsRefreshInterval: number;
  testMode: boolean;
  retryStrategy: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    jitterPercentage: number;
  };
  circuitBreaker: {
    failureThreshold: number;
    recoveryTimeoutMs: number;
    monitoringWindowMs: number;
  };
  timing: {
    executionDelayMs: number;
    preExecutionBufferMs: number;
    maxExecutionWindowMs: number;
  };
  rateLimiting: {
    maxConcurrentRequests: number;
    requestsPerSecond: number;
    burstSize: number;
  };
  monitoring: {
    healthCheckIntervalMs: number;
    metricsRetentionHours: number;
    enableDetailedLogging: boolean;
  };
}

export interface CalendarResponse {
  data: CalendarEntry[];
}

export interface SymbolsV2Response {
  data: {
    symbols: SymbolV2Entry[];
  };
}

export interface ErrorEntry {
  timestamp: Date;
  type: 'API_ERROR' | 'EXECUTION_ERROR' | 'VALIDATION_ERROR' | 'TIMEOUT_ERROR';
  message: string;
  context?: Record<string, unknown>;
  retryCount: number;
  resolved: boolean;
}

export interface PerformanceMetrics {
  timestamp: Date;
  detectionLatencyMs: number;
  executionLatencyMs: number;
  apiResponseTimeMs: number;
  memoryUsageMB: number;
  cpuUsagePercent?: number;
}
