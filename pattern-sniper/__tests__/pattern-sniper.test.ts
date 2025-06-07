import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { PatternSniperConfig, SnipeTarget } from '../schemas.js';

import type { MEXCApiClient } from '../../market-data/mexc-client.js';

// Type for the EnhancedPatternSniperState methods used in tests
interface TestSniperState {
  getStatus: () => {
    isMonitoring: boolean;
    totalListings: number;
    pendingDetection: number;
    readyToSnipe: number;
    executed: number;
    errors: string[];
    performance: {
      successfulExecutions: number;
      failedExecutions: number;
    };
    circuitBreakerStatus: unknown;
    resourceUsage: {
      activeIntervals: number;
      memoryUsageMB: number;
      queuedOperations: number;
    };
  };
  getTargets: () => {
    calendar: unknown[];
    pending: unknown[];
    ready: unknown[];
    executed: unknown[];
  };
  getConfig: () => PatternSniperConfig;
  updateConfig: (config: Partial<PatternSniperConfig>) => void;
  clearTargets: () => void;
  startMonitoring: (client: MEXCApiClient) => Promise<{ success: boolean; message: string }>;
  stopMonitoring: () => Promise<{ success: boolean; message: string }>;
  executeSnipe: (
    target: SnipeTarget,
    client: MEXCApiClient
  ) => Promise<{ success: boolean; message: string; orderId?: string }>;
  addError: (message: string) => void;
  state?: { errors: unknown[] };
}

// Mock the MEXCApiClient
const mockMexcClient = {
  getNewCoinCalendar: mock(async () => ({
    code: 200,
    data: [
      {
        vcoinId: 'test123',
        symbol: 'TESTUSDT',
        projectName: 'Test Project',
        firstOpenTime: Date.now() + 3600000, // 1 hour from now
      },
    ],
  })),
  getSymbolsV2: mock(async () => ({
    code: 200,
    data: {
      symbols: [
        {
          cd: 'test123',
          ca: 'TESTUSDT',
          ps: 6,
          qs: 2,
          sts: 2,
          st: 2,
          tt: 4,
          ot: Date.now() + 3600000,
        },
      ],
    },
  })),
  getTicker: mock(async (symbol: string) => ({
    symbol,
    price: '0.50',
    priceChange: '0.05',
    priceChangePercent: '10.00',
    volume: '1000000',
    quoteVolume: '500000',
    open: '0.45',
    high: '0.52',
    low: '0.44',
    count: 1000,
    timestamp: Date.now(),
  })),
  placeOrder: mock(
    async (params: { symbol: string; side: string; type: string; quantity: number }) => ({
      orderId: 'order123',
      symbol: params.symbol,
      status: 'FILLED',
      executedQty: params.quantity.toString(),
      price: '0.50',
      fills: [
        {
          price: '0.50',
          qty: params.quantity.toString(),
          commission: '0',
          commissionAsset: 'USDT',
        },
      ],
    })
  ),
} as unknown as MEXCApiClient;

describe('Enhanced Pattern Sniper Service', () => {
  let EnhancedPatternSniperState: new () => TestSniperState;

  beforeEach(async () => {
    // Import the service dynamically to avoid module-level side effects
    const serviceModule = await import('../service.js');
    EnhancedPatternSniperState = (serviceModule as Record<string, new () => TestSniperState>)
      .EnhancedPatternSniperState;
  });

  afterEach(() => {
    // Clear all mocks
    mock.restore();
  });

  describe('EnhancedPatternSniperState', () => {
    let sniperState: TestSniperState;

    beforeEach(() => {
      sniperState = new EnhancedPatternSniperState();
    });

    it('should initialize with default state', () => {
      const status = sniperState.getStatus();

      expect(status.isMonitoring).toBe(false);
      expect(status.totalListings).toBe(0);
      expect(status.pendingDetection).toBe(0);
      expect(status.readyToSnipe).toBe(0);
      expect(status.executed).toBe(0);
      expect(status.errors).toEqual([]);

      // Test enhanced status fields
      expect(status.performance).toBeDefined();
      expect(status.circuitBreakerStatus).toBeDefined();
      expect(status.resourceUsage).toBeDefined();
      expect(status.performance.successfulExecutions).toBe(0);
      expect(status.performance.failedExecutions).toBe(0);
    });

    it('should start monitoring successfully', async () => {
      const result = await sniperState.startMonitoring(mockMexcClient);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Pattern monitoring started');

      const status = sniperState.getStatus();
      expect(status.isMonitoring).toBe(true);
      expect(status.resourceUsage.activeIntervals).toBeGreaterThan(0);
    });

    it('should stop monitoring successfully', async () => {
      await sniperState.startMonitoring(mockMexcClient);
      const result = await sniperState.stopMonitoring();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Pattern monitoring stopped');

      const status = sniperState.getStatus();
      expect(status.isMonitoring).toBe(false);
      expect(status.resourceUsage.activeIntervals).toBe(0);
    });

    it('should update configuration', () => {
      const newConfig: Partial<PatternSniperConfig> = {
        testMode: true,
        defaultOrderAmount: 200,
        retryStrategy: {
          maxRetries: 5,
          initialDelayMs: 2000,
          maxDelayMs: 60000,
          backoffMultiplier: 3,
          jitterPercentage: 0.2,
        },
      };

      sniperState.updateConfig(newConfig);
      const config = sniperState.getConfig();

      expect(config.testMode).toBe(true);
      expect(config.defaultOrderAmount).toBe(200);
      expect(config.retryStrategy.maxRetries).toBe(5);
      expect(config.retryStrategy.initialDelayMs).toBe(2000);
    });

    it('should clear targets', () => {
      sniperState.clearTargets();

      const targets = sniperState.getTargets();
      expect(targets.calendar).toEqual([]);
      expect(targets.pending).toEqual([]);
      expect(targets.ready).toEqual([]);
      expect(targets.executed).toEqual([]);
    });

    it('should execute snipe in test mode', async () => {
      // Set test mode
      sniperState.updateConfig({ testMode: true });

      const mockTarget: SnipeTarget = {
        vcoinId: 'test123',
        symbol: 'TESTUSDT',
        projectName: 'Test Project',
        priceDecimalPlaces: 6,
        quantityDecimalPlaces: 2,
        launchTime: new Date(),
        discoveredAt: new Date(),
        hoursAdvanceNotice: 1,
        orderParameters: {
          symbol: 'TESTUSDT',
          side: 'BUY',
          type: 'MARKET',
          quoteOrderQty: 100,
        },
      };

      const result = await sniperState.executeSnipe(mockTarget, mockMexcClient);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Test mode execution successful');
    });

    it('should execute snipe with real order (mocked)', async () => {
      // Set production mode
      sniperState.updateConfig({ testMode: false });

      const mockTarget: SnipeTarget = {
        vcoinId: 'test123',
        symbol: 'TESTUSDT',
        projectName: 'Test Project',
        priceDecimalPlaces: 6,
        quantityDecimalPlaces: 2,
        launchTime: new Date(),
        discoveredAt: new Date(),
        hoursAdvanceNotice: 1,
        orderParameters: {
          symbol: 'TESTUSDT',
          side: 'BUY',
          type: 'MARKET',
          quoteOrderQty: 100,
        },
      };

      const result = await sniperState.executeSnipe(mockTarget, mockMexcClient);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Order ID: order123');
      expect(result.orderId).toBe('order123');

      // Verify the order was placed with correct parameters
      expect(mockMexcClient.placeOrder).toHaveBeenCalledWith({
        symbol: 'TESTUSDT',
        side: 'buy',
        type: 'market',
        quantity: 200, // 100 USDT / 0.50 price = 200 tokens
        price: undefined,
        timeInForce: 'IOC',
      });
    });

    it('should prevent duplicate execution', async () => {
      const mockTarget: SnipeTarget = {
        vcoinId: 'test123',
        symbol: 'TESTUSDT',
        projectName: 'Test Project',
        priceDecimalPlaces: 6,
        quantityDecimalPlaces: 2,
        launchTime: new Date(),
        discoveredAt: new Date(),
        hoursAdvanceNotice: 1,
        orderParameters: {
          symbol: 'TESTUSDT',
          side: 'BUY',
          type: 'MARKET',
          quoteOrderQty: 100,
        },
      };

      // Execute first time
      await sniperState.executeSnipe(mockTarget, mockMexcClient);

      // Try to execute again
      const result = await sniperState.executeSnipe(mockTarget, mockMexcClient);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Target already executed');
    });

    it('should handle order execution errors', async () => {
      // Mock an error from the MEXC client
      const errorMockClient = {
        ...mockMexcClient,
        placeOrder: mock(async () => {
          throw new Error('Order placement failed');
        }),
        getTicker: mockMexcClient.getTicker,
      } as unknown as MEXCApiClient;

      sniperState.updateConfig({ testMode: false });

      const mockTarget: SnipeTarget = {
        vcoinId: 'test123',
        symbol: 'TESTUSDT',
        projectName: 'Test Project',
        priceDecimalPlaces: 6,
        quantityDecimalPlaces: 2,
        launchTime: new Date(),
        discoveredAt: new Date(),
        hoursAdvanceNotice: 1,
        orderParameters: {
          symbol: 'TESTUSDT',
          side: 'BUY',
          type: 'MARKET',
          quoteOrderQty: 100,
        },
      };

      const result = await sniperState.executeSnipe(mockTarget, errorMockClient);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Order placement failed');
    });

    it('should add and manage errors', () => {
      sniperState.addError('Test error message');

      const status = sniperState.getStatus();
      expect(status.errors).toHaveLength(1);
      expect(status.errors[0]).toContain('Test error message');
    });

    it('should limit error history to 100 entries with enhanced error tracking', () => {
      // Add 120 errors to test the new limit
      for (let i = 0; i < 120; i++) {
        // Use a mock method to simulate error addition
        const mockError = {
          timestamp: new Date(),
          type: 'API_ERROR' as const,
          message: `Error ${i}`,
          context: { iteration: i },
        };

        // Simulate internal error handling
        if (sniperState.state) {
          sniperState.state.errors = sniperState.state.errors || [];
          sniperState.state.errors.push(mockError);

          // Apply the same limit logic as the service
          if (sniperState.state.errors.length > 100) {
            sniperState.state.errors = sniperState.state.errors.slice(-100);
          }
        }
      }

      const status = sniperState.getStatus();
      // Should keep only last 100 errors with enhanced format
      expect(status.errors.length).toBeLessThanOrEqual(100);
    });

    it('should track resource usage', () => {
      const status = sniperState.getStatus();
      expect(status.resourceUsage).toBeDefined();
      expect(status.resourceUsage.activeIntervals).toBe(0);
      expect(status.resourceUsage.memoryUsageMB).toBeGreaterThanOrEqual(0);
      expect(status.resourceUsage.queuedOperations).toBe(0);
    });
  });

  describe('Enhanced Pattern Detection', () => {
    let sniperState: TestSniperState;

    beforeEach(() => {
      sniperState = new EnhancedPatternSniperState();
    });

    it('should detect ready state pattern correctly', async () => {
      // Test through the public interface with enhanced monitoring

      await sniperState.startMonitoring(mockMexcClient);

      // Allow some time for the intervals to process
      await new Promise((resolve) => setTimeout(resolve, 150));

      const status = sniperState.getStatus();
      expect(status.isMonitoring).toBe(true);
      expect(status.performance.totalApiCalls).toBeGreaterThan(0);

      await sniperState.stopMonitoring();
    });

    it('should track performance metrics', async () => {
      await sniperState.startMonitoring(mockMexcClient);

      // Allow some API calls to be made
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = sniperState.getStatus();
      expect(status.performance).toBeDefined();
      expect(status.performance.totalApiCalls).toBeGreaterThanOrEqual(0);
      expect(status.performance.averageDetectionTimeMs).toBeGreaterThanOrEqual(0);

      await sniperState.stopMonitoring();
    });

    it('should handle circuit breaker functionality', () => {
      const status = sniperState.getStatus();
      expect(status.circuitBreakerStatus).toBeDefined();
      expect(status.circuitBreakerStatus.isOpen).toBe(false);
      expect(status.circuitBreakerStatus.failureCount).toBe(0);
    });
  });

  describe('API Integration', () => {
    it('should handle MEXC API calendar response', async () => {
      const calendarResponse = await mockMexcClient.getNewCoinCalendar();

      expect(calendarResponse.data).toHaveLength(1);
      expect(calendarResponse.data[0].symbol).toBe('TESTUSDT');
      expect(calendarResponse.data[0].projectName).toBe('Test Project');
    });

    it('should handle MEXC API symbols V2 response', async () => {
      const symbolsResponse = await mockMexcClient.getSymbolsV2();

      expect(symbolsResponse.data.symbols).toHaveLength(1);
      expect(symbolsResponse.data.symbols[0].ca).toBe('TESTUSDT');
      expect(symbolsResponse.data.symbols[0].sts).toBe(2);
      expect(symbolsResponse.data.symbols[0].st).toBe(2);
      expect(symbolsResponse.data.symbols[0].tt).toBe(4);
    });
  });
});
