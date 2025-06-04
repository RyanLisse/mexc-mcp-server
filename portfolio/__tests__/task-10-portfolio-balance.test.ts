/**
 * Task #10: Portfolio Balance API Tests
 * TDD tests for implementing portfolio balance endpoint with real-time account balance tracking, USD conversion, and Redis caching
 * Requirements:
 * - Create GET endpoint for account balances
 * - Fetch from MEXC REST API
 * - Convert to USD using latest rates
 * - Cache balances in Redis
 * - Example: GET /portfolio/balance
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type BalanceResponse,
  type Logger,
  type MexcClient,
  type PortfolioBalanceData,
  type RedisCache,
  TaskTenPortfolioBalanceService,
} from '../task-10-portfolio-balance-service';

// Mock implementations
const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

const mockMexcClient: MexcClient = {
  getAccountInfo: vi.fn(),
  getCurrentPrices: vi.fn(),
};

const mockRedisCache: RedisCache = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  ttl: vi.fn(),
};

describe('Task #10: Portfolio Balance API with Real-time USD Conversion and Redis Caching', () => {
  let balanceService: TaskTenPortfolioBalanceService;

  const mockAccountInfo = {
    balances: [
      { asset: 'USDT', free: '1000.00000000', locked: '0.00000000' },
      { asset: 'BTC', free: '0.50000000', locked: '0.00000000' },
      { asset: 'ETH', free: '2.00000000', locked: '0.50000000' },
      { asset: 'BNB', free: '10.00000000', locked: '0.00000000' },
    ],
  };

  const mockPrices = {
    BTCUSDT: '50000.00',
    ETHUSDT: '3000.00',
    BNBUSDT: '250.00',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock responses
    (mockMexcClient.getAccountInfo as any).mockResolvedValue(mockAccountInfo);
    (mockMexcClient.getCurrentPrices as any).mockResolvedValue(mockPrices);
    (mockRedisCache.get as any).mockResolvedValue(null); // No cache by default
    (mockRedisCache.set as any).mockResolvedValue('OK');
    (mockRedisCache.exists as any).mockResolvedValue(false);

    balanceService = new TaskTenPortfolioBalanceService(mockLogger, mockMexcClient, mockRedisCache);
  });

  describe('Balance Retrieval with USD Conversion', () => {
    it('should retrieve account balances from MEXC API', async () => {
      const result = await balanceService.getBalance();

      expect(result.success).toBe(true);
      expect(result.data?.balances).toHaveLength(4);
      expect(mockMexcClient.getAccountInfo).toHaveBeenCalled();
    });

    it('should convert all assets to USD correctly', async () => {
      const result = await balanceService.getBalance();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const { balances } = result.data;

      // USDT should be 1:1
      const usdtBalance = balances.find((b) => b.asset === 'USDT');
      expect(usdtBalance?.usdValue).toBe('1000.00');

      // BTC should be 0.5 * 50000 = 25000
      const btcBalance = balances.find((b) => b.asset === 'BTC');
      expect(btcBalance?.usdValue).toBe('25000.00');

      // ETH should be 2.5 * 3000 = 7500 (2.0 free + 0.5 locked)
      const ethBalance = balances.find((b) => b.asset === 'ETH');
      expect(ethBalance?.total).toBe('2.50000000');
      expect(ethBalance?.usdValue).toBe('7500.00');

      // BNB should be 10 * 250 = 2500
      const bnbBalance = balances.find((b) => b.asset === 'BNB');
      expect(bnbBalance?.usdValue).toBe('2500.00');
    });

    it('should calculate correct total portfolio value', async () => {
      const result = await balanceService.getBalance();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const { totalValue } = result.data;

      // 1000 (USDT) + 25000 (BTC) + 7500 (ETH) + 2500 (BNB) = 36000
      expect(totalValue).toBe('36000.00');
    });

    it('should calculate correct asset percentages', async () => {
      const result = await balanceService.getBalance();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const { balances } = result.data;

      const btcBalance = balances.find((b) => b.asset === 'BTC');
      expect(btcBalance?.percentage).toBeCloseTo(69.44, 2); // 25000/36000 * 100

      const ethBalance = balances.find((b) => b.asset === 'ETH');
      expect(ethBalance?.percentage).toBeCloseTo(20.83, 2); // 7500/36000 * 100

      const usdtBalance = balances.find((b) => b.asset === 'USDT');
      expect(usdtBalance?.percentage).toBeCloseTo(2.78, 2); // 1000/36000 * 100

      const bnbBalance = balances.find((b) => b.asset === 'BNB');
      expect(bnbBalance?.percentage).toBeCloseTo(6.94, 2); // 2500/36000 * 100
    });

    it('should exclude zero balances by default', async () => {
      // Mock account with zero balance
      (mockMexcClient.getAccountInfo as any).mockResolvedValue({
        balances: [
          { asset: 'USDT', free: '1000.00000000', locked: '0.00000000' },
          { asset: 'ADA', free: '0.00000000', locked: '0.00000000' },
        ],
      });

      const result = await balanceService.getBalance();

      expect(result.success).toBe(true);
      expect(result.data?.balances).toHaveLength(1);
      expect(result.data?.balances[0].asset).toBe('USDT');
    });

    it('should include zero balances when requested', async () => {
      // Mock account with zero balance
      (mockMexcClient.getAccountInfo as any).mockResolvedValue({
        balances: [
          { asset: 'USDT', free: '1000.00000000', locked: '0.00000000' },
          { asset: 'ADA', free: '0.00000000', locked: '0.00000000' },
        ],
      });

      const result = await balanceService.getBalance({ includeZero: true });

      expect(result.success).toBe(true);
      expect(result.data?.balances).toHaveLength(2);

      const adaBalance = result.data?.balances.find((b) => b.asset === 'ADA');
      expect(adaBalance?.usdValue).toBe('0.00');
    });
  });

  describe('Redis Caching', () => {
    it('should cache balance data in Redis', async () => {
      await balanceService.getBalance();

      expect(mockRedisCache.set).toHaveBeenCalledWith(
        'portfolio:balance:default',
        expect.any(String),
        { ttl: 30 } // 30 seconds TTL
      );
    });

    it('should return cached data when available', async () => {
      const cachedData: PortfolioBalanceData = {
        balances: [
          {
            asset: 'USDT',
            free: '500.00000000',
            locked: '0.00000000',
            total: '500.00000000',
            usdValue: '500.00',
            percentage: 100,
          },
        ],
        totalValue: '500.00',
        timestamp: new Date().toISOString(),
      };

      (mockRedisCache.get as any).mockResolvedValue(JSON.stringify(cachedData));
      (mockRedisCache.exists as any).mockResolvedValue(true);

      const result = await balanceService.getBalance();

      expect(result.success).toBe(true);
      expect(result.data?.totalValue).toBe('500.00');
      expect(mockMexcClient.getAccountInfo).not.toHaveBeenCalled();
    });

    it('should refresh cache when forceRefresh is true', async () => {
      const cachedData = {
        balances: [],
        totalValue: '0.00',
        timestamp: new Date().toISOString(),
      };

      (mockRedisCache.get as any).mockResolvedValue(JSON.stringify(cachedData));
      (mockRedisCache.exists as any).mockResolvedValue(true);

      const result = await balanceService.getBalance({ forceRefresh: true });

      expect(result.success).toBe(true);
      expect(mockMexcClient.getAccountInfo).toHaveBeenCalled();
      expect(mockRedisCache.set).toHaveBeenCalled();
    });

    it('should use different cache keys for different options', async () => {
      await balanceService.getBalance({ includeZero: true });

      expect(mockRedisCache.set).toHaveBeenCalledWith(
        'portfolio:balance:includeZero',
        expect.any(String),
        { ttl: 30 }
      );
    });

    it('should handle Redis cache failures gracefully', async () => {
      (mockRedisCache.exists as any).mockRejectedValue(new Error('Redis connection failed'));

      const result = await balanceService.getBalance();

      expect(result.success).toBe(true);
      expect(mockMexcClient.getAccountInfo).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache read failed',
        expect.objectContaining({ error: 'Redis connection failed' })
      );
    });

    it('should continue operation even if cache write fails', async () => {
      (mockRedisCache.set as any).mockRejectedValue(new Error('Redis write failed'));

      const result = await balanceService.getBalance();

      expect(result.success).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache write failed',
        expect.objectContaining({ error: 'Redis write failed' })
      );
    });
  });

  describe('Price Conversion Logic', () => {
    it('should handle stablecoins without price conversion', async () => {
      (mockMexcClient.getAccountInfo as any).mockResolvedValue({
        balances: [
          { asset: 'USDT', free: '1000.00', locked: '0.00' },
          { asset: 'USDC', free: '500.00', locked: '0.00' },
          { asset: 'BUSD', free: '250.00', locked: '0.00' },
        ],
      });

      const result = await balanceService.getBalance();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const { balances } = result.data;

      for (const balance of balances) {
        // For stablecoins, USD value should equal total amount
        expect(balance.usdValue).toBe(Number(balance.total).toFixed(2));
      }
    });

    it('should handle missing price data gracefully', async () => {
      (mockMexcClient.getAccountInfo as any).mockResolvedValue({
        balances: [{ asset: 'UNKNOWN', free: '100.00', locked: '0.00' }],
      });

      (mockMexcClient.getCurrentPrices as any).mockResolvedValue({}); // No prices

      const result = await balanceService.getBalance();

      expect(result.success).toBe(true);
      const unknownBalance = result.data?.balances.find((b) => b.asset === 'UNKNOWN');
      expect(unknownBalance?.usdValue).toBe('0.00');
    });

    it('should use BTC as intermediate currency for conversion', async () => {
      (mockMexcClient.getAccountInfo as any).mockResolvedValue({
        balances: [{ asset: 'ALTCOIN', free: '100.00', locked: '0.00' }],
      });

      (mockMexcClient.getCurrentPrices as any).mockResolvedValue({
        ALTCOINBTC: '0.001', // 100 ALTCOIN = 0.1 BTC
        BTCUSDT: '50000.00', // 1 BTC = 50000 USDT
      });

      const result = await balanceService.getBalance();

      expect(result.success).toBe(true);
      const altcoinBalance = result.data?.balances.find((b) => b.asset === 'ALTCOIN');
      // 100 * 0.001 * 50000 = 5000
      expect(altcoinBalance?.usdValue).toBe('5000.00');
    });
  });

  describe('Response Time Performance', () => {
    it('should respond within 200ms for cached data', async () => {
      const cachedData = {
        balances: [],
        totalValue: '0.00',
        timestamp: new Date().toISOString(),
      };

      (mockRedisCache.get as any).mockResolvedValue(JSON.stringify(cachedData));
      (mockRedisCache.exists as any).mockResolvedValue(true);

      const startTime = Date.now();
      await balanceService.getBalance();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200);
    });

    it('should complete fresh data fetch within reasonable time', async () => {
      const startTime = Date.now();
      await balanceService.getBalance();
      const endTime = Date.now();

      // Should complete within 2 seconds for fresh data
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Error Handling', () => {
    it('should handle MEXC API errors gracefully', async () => {
      (mockMexcClient.getAccountInfo as any).mockRejectedValue(new Error('MEXC API Error'));

      const result = await balanceService.getBalance();

      expect(result.success).toBe(false);
      expect(result.error).toContain('MEXC API Error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch portfolio balance',
        expect.objectContaining({ error: 'MEXC API Error' })
      );
    });

    it('should handle price API errors gracefully', async () => {
      (mockMexcClient.getCurrentPrices as any).mockRejectedValue(new Error('Price API Error'));

      const result = await balanceService.getBalance();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Price API Error');
    });

    it('should include timestamp in all responses', async () => {
      const result = await balanceService.getBalance();

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should handle malformed API responses', async () => {
      (mockMexcClient.getAccountInfo as any).mockResolvedValue(null);

      const result = await balanceService.getBalance();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid account info response');
    });

    it('should handle malformed balance data', async () => {
      (mockMexcClient.getAccountInfo as any).mockResolvedValue({
        balances: [{ asset: '', free: 'invalid', locked: 'invalid' }],
      });

      const result = await balanceService.getBalance();

      expect(result.success).toBe(true);
      expect(result.data?.balances).toHaveLength(0); // Invalid balances filtered out
    });
  });

  describe('Comprehensive Logging', () => {
    it('should log balance retrieval requests', async () => {
      await balanceService.getBalance();

      expect(mockLogger.info).toHaveBeenCalledWith('Portfolio balance request', {
        includeZero: false,
        forceRefresh: false,
        timestamp: expect.any(Number),
      });
    });

    it('should log successful balance retrieval', async () => {
      await balanceService.getBalance();

      expect(mockLogger.info).toHaveBeenCalledWith('Portfolio balance retrieved successfully', {
        totalAssets: expect.any(Number),
        totalValue: expect.any(String),
        cached: false,
        processingTime: expect.any(Number),
      });
    });

    it('should log cache hits', async () => {
      const cachedData = {
        balances: [],
        totalValue: '0.00',
        timestamp: new Date().toISOString(),
      };

      (mockRedisCache.get as any).mockResolvedValue(JSON.stringify(cachedData));
      (mockRedisCache.exists as any).mockResolvedValue(true);

      await balanceService.getBalance();

      expect(mockLogger.info).toHaveBeenCalledWith('Portfolio balance retrieved successfully', {
        totalAssets: 0,
        totalValue: '0.00',
        cached: true,
        processingTime: expect.any(Number),
      });
    });

    it('should log cache misses and refreshes', async () => {
      await balanceService.getBalance();

      expect(mockLogger.debug).toHaveBeenCalledWith('Cache miss, fetching fresh data', {
        cacheKey: 'portfolio:balance:default',
      });
    });
  });

  describe('Data Validation', () => {
    it('should validate balance data structure', async () => {
      const result = await balanceService.getBalance();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const { balances } = result.data;

      for (const balance of balances) {
        expect(balance).toHaveProperty('asset');
        expect(balance).toHaveProperty('free');
        expect(balance).toHaveProperty('locked');
        expect(balance).toHaveProperty('total');
        expect(balance).toHaveProperty('usdValue');
        expect(balance).toHaveProperty('percentage');

        expect(typeof balance.asset).toBe('string');
        expect(typeof balance.free).toBe('string');
        expect(typeof balance.locked).toBe('string');
        expect(typeof balance.total).toBe('string');
        expect(typeof balance.usdValue).toBe('string');
        expect(typeof balance.percentage).toBe('number');
      }
    });

    it('should ensure percentages sum to 100', async () => {
      const result = await balanceService.getBalance();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const { balances } = result.data;

      const totalPercentage = balances.reduce((sum, balance) => sum + balance.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);
    });

    it('should validate numeric calculations', async () => {
      const result = await balanceService.getBalance();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      const { balances, totalValue } = result.data;

      const calculatedTotal = balances.reduce((sum, balance) => sum + Number(balance.usdValue), 0);
      expect(Number(totalValue)).toBeCloseTo(calculatedTotal, 2);
    });
  });
});
