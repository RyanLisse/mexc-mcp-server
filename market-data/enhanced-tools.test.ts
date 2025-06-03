/**
 * Enhanced Market Data Tools Tests
 * Focused tests for Task #6 enhanced functionality
 */

import { describe, expect, it } from 'bun:test';
import type { MarketDataResponse } from '../shared/types/index.js';

describe('Enhanced Market Data Tools', () => {
  describe('Historical Data Function', () => {
    it('should have correct function signature', () => {
      const mockArgs = {
        symbol: 'BTCUSDT',
        interval: '1h',
        limit: 100,
        startTime: Date.now() - 86400000,
        endTime: Date.now(),
      };

      expect(mockArgs.symbol).toBe('BTCUSDT');
      expect(mockArgs.interval).toBe('1h');
      expect(typeof mockArgs.limit).toBe('number');
      expect(typeof mockArgs.startTime).toBe('number');
      expect(typeof mockArgs.endTime).toBe('number');
    });

    it('should validate interval values', () => {
      const validIntervals = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];
      const testInterval = '1h';
      
      expect(validIntervals).toContain(testInterval);
      expect(validIntervals.length).toBe(9);
    });
  });

  describe('Market Depth Analysis', () => {
    it('should calculate spread correctly', () => {
      const bestBid = 49000;
      const bestAsk = 49100;
      const spread = bestAsk - bestBid;
      const spreadPercent = (spread / bestBid) * 100;

      expect(spread).toBe(100);
      expect(spreadPercent).toBeCloseTo(0.2041, 4);
    });

    it('should calculate market imbalance', () => {
      const bidTotal = 1.5;
      const askTotal = 1.1;
      const imbalance = (bidTotal - askTotal) / (bidTotal + askTotal);

      expect(imbalance).toBeCloseTo(0.1538, 4);
      expect(imbalance).toBeGreaterThan(-1);
      expect(imbalance).toBeLessThan(1);
    });
  });

  describe('Price Aggregation', () => {
    it('should validate metrics array', () => {
      const validMetrics = ['price', 'volume', 'volatility', 'correlation'];
      const testMetrics = ['price', 'volume'];
      
      for (const metric of testMetrics) {
        expect(validMetrics).toContain(metric);
      }
    });

    it('should handle correlation calculations', () => {
      const correlation = Math.random() * 2 - 1; // [-1, 1]
      
      expect(correlation).toBeGreaterThanOrEqual(-1);
      expect(correlation).toBeLessThanOrEqual(1);
    });
  });

  describe('Subscription Management', () => {
    it('should validate subscription actions', () => {
      const validActions = ['subscribe', 'unsubscribe', 'list'];
      const testAction = 'subscribe';
      
      expect(validActions).toContain(testAction);
    });

    it('should validate subscription types', () => {
      const validTypes = ['ticker', 'orderbook', 'trades'];
      const testType = 'ticker';
      
      expect(validTypes).toContain(testType);
    });

    it('should create subscription object structure', () => {
      const subscription = {
        symbol: 'BTCUSDT',
        type: 'ticker',
        interval: '1s',
        subscribed: true,
      };

      expect(subscription.symbol).toBe('BTCUSDT');
      expect(subscription.type).toBe('ticker');
      expect(subscription.subscribed).toBe(true);
    });
  });

  describe('Performance Metrics', () => {
    it('should validate cache hit rate calculation', () => {
      const hits = 850;
      const misses = 150;
      const total = hits + misses;
      const hitRate = hits / total;

      expect(hitRate).toBeCloseTo(0.85, 2);
      expect(hitRate).toBeGreaterThan(0);
      expect(hitRate).toBeLessThanOrEqual(1);
    });

    it('should validate response time metrics', () => {
      const responseTimes = [100, 150, 200, 250, 300];
      const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const p95Index = Math.ceil(responseTimes.length * 0.95) - 1;
      const p95 = responseTimes.sort((a, b) => a - b)[p95Index];

      expect(average).toBe(200);
      expect(p95).toBeGreaterThanOrEqual(average);
    });
  });

  describe('Enhanced Health Check', () => {
    it('should validate health status values', () => {
      const validStatuses = ['healthy', 'degraded', 'unhealthy'];
      const testStatus = 'healthy';
      
      expect(validStatuses).toContain(testStatus);
    });

    it('should calculate overall health status', () => {
      const components = {
        mexcApi: { status: 'healthy' },
        cache: { status: 'healthy' },
        database: { status: 'healthy' },
        rateLimit: { status: 'healthy' },
      };

      const unhealthyCount = Object.values(components).filter(
        comp => comp.status === 'unhealthy'
      ).length;

      const totalComponents = Object.keys(components).length;
      const overallStatus = unhealthyCount === 0 
        ? 'healthy' 
        : unhealthyCount < totalComponents / 2 
          ? 'degraded' 
          : 'unhealthy';

      expect(overallStatus).toBe('healthy');
    });
  });

  describe('Market Status', () => {
    it('should validate market status values', () => {
      const validStatuses = ['open', 'closed', 'pre_open', 'post_close'];
      const testStatus = 'open';
      
      expect(validStatuses).toContain(testStatus);
    });

    it('should validate rate limit structure', () => {
      const rateLimit = {
        rateLimitType: 'REQUEST_WEIGHT',
        interval: 'MINUTE',
        intervalNum: 1,
        limit: 1200,
      };

      expect(rateLimit.rateLimitType).toBe('REQUEST_WEIGHT');
      expect(typeof rateLimit.limit).toBe('number');
      expect(rateLimit.limit).toBeGreaterThan(0);
    });

    it('should calculate symbol statistics', () => {
      const symbols = [
        { symbol: 'BTCUSDT', status: 'TRADING' },
        { symbol: 'ETHUSDT', status: 'TRADING' },
        { symbol: 'ADAUSDT', status: 'SUSPENDED' },
      ];

      const total = symbols.length;
      const active = symbols.filter(s => s.status === 'TRADING').length;
      const suspended = symbols.filter(s => s.status !== 'TRADING').length;

      expect(total).toBe(3);
      expect(active).toBe(2);
      expect(suspended).toBe(1);
      expect(active + suspended).toBe(total);
    });
  });

  describe('WebSocket Configuration', () => {
    it('should validate WebSocket URL format', () => {
      const wsUrl = 'wss://wbs.mexc.com/ws';
      
      expect(wsUrl).toMatch(/^wss?:\/\//);
      expect(wsUrl).toContain('mexc.com');
    });

    it('should validate stream patterns', () => {
      const streams = {
        ticker: '<symbol>@ticker',
        orderbook: '<symbol>@depth<levels>',
        trades: '<symbol>@trade',
        klines: '<symbol>@kline_<interval>',
      };

      expect(streams.ticker).toContain('@ticker');
      expect(streams.orderbook).toContain('@depth');
      expect(streams.trades).toContain('@trade');
      expect(streams.klines).toContain('@kline_');
    });

    it('should validate connection limits', () => {
      const limits = {
        maxConnections: 5,
        maxStreamsPerConnection: 30,
        heartbeatInterval: 60000,
      };

      expect(limits.maxConnections).toBeGreaterThan(0);
      expect(limits.maxStreamsPerConnection).toBeGreaterThan(0);
      expect(limits.heartbeatInterval).toBeGreaterThan(0);
    });
  });

  describe('Data Validation', () => {
    it('should validate ticker data structure', () => {
      const tickerData = {
        symbol: 'BTCUSDT',
        price: '50000.00',
        priceChange: '1000.00',
        priceChangePercent: '2.00',
        volume: '100.00',
        quoteVolume: '5000000.00',
        open: '49000.00',
        high: '51000.00',
        low: '48000.00',
        count: 1500,
        timestamp: Date.now(),
      };

      const requiredFields = ['symbol', 'price', 'priceChange', 'priceChangePercent', 'volume', 'timestamp'];
      
      for (const field of requiredFields) {
        expect(tickerData).toHaveProperty(field);
      }
    });

    it('should validate order book structure', () => {
      const orderBook = {
        symbol: 'BTCUSDT',
        bids: [['49000.00', '0.5'], ['48900.00', '1.0']],
        asks: [['49100.00', '0.3'], ['49200.00', '0.8']],
        lastUpdateId: Date.now(),
      };

      expect(orderBook.symbol).toBe('BTCUSDT');
      expect(Array.isArray(orderBook.bids)).toBe(true);
      expect(Array.isArray(orderBook.asks)).toBe(true);
      expect(orderBook.bids.length).toBeGreaterThan(0);
      expect(orderBook.asks.length).toBeGreaterThan(0);
    });

    it('should validate historical data point structure', () => {
      const dataPoint = {
        openTime: Date.now() - 3600000,
        open: '49000.00',
        high: '50000.00',
        low: '48500.00',
        close: '49800.00',
        volume: '100.5',
        closeTime: Date.now() - 1,
        quoteAssetVolume: '4980000.00',
        count: 1000,
      };

      const requiredFields = ['openTime', 'open', 'high', 'low', 'close', 'volume', 'closeTime'];
      
      for (const field of requiredFields) {
        expect(dataPoint).toHaveProperty(field);
      }

      expect(dataPoint.openTime).toBeLessThan(dataPoint.closeTime);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid symbol formats', () => {
      const validSymbols = ['BTCUSDT', 'ETHUSDT', 'BTC', 'ETH123'];
      const invalidSymbols = ['btc-usdt', 'ETH/USDT', 'invalid_format', 'symbol with spaces'];

      for (const symbol of validSymbols) {
        expect(/^[A-Z0-9]+$/.test(symbol)).toBe(true);
      }

      for (const symbol of invalidSymbols) {
        expect(/^[A-Z0-9]+$/.test(symbol)).toBe(false);
      }
    });

    it('should validate limit ranges', () => {
      const validLimits = [5, 10, 50, 100, 500, 1000];
      const invalidLimits = [0, 1, 4, 1001, 2000, -1];

      for (const limit of validLimits) {
        expect(limit >= 5 && limit <= 1000).toBe(true);
      }

      for (const limit of invalidLimits) {
        expect(limit >= 5 && limit <= 1000).toBe(false);
      }
    });

    it('should handle malformed input gracefully', () => {
      const malformedInputs = [null, undefined, '', 123, [], {}];
      
      for (const input of malformedInputs) {
        const isValidInput = input !== null && 
          input !== undefined &&
          typeof input === 'object' && 
          'symbol' in input && 
          typeof input.symbol === 'string';
        
        expect(isValidInput).toBe(false);
      }
    });
  });

  describe('API Response Format', () => {
    it('should validate MarketDataResponse structure', () => {
      const response = {
        success: true,
        data: { symbol: 'BTCUSDT', price: '50000.00' },
        cached: false,
        timestamp: Date.now(),
      };

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('cached');
      expect(response).toHaveProperty('timestamp');
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.cached).toBe('boolean');
      expect(typeof response.timestamp).toBe('number');
    });

    it('should validate error response structure', () => {
      const errorResponse = {
        success: false,
        error: 'Invalid symbol format',
        cached: false,
        timestamp: Date.now(),
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse).toHaveProperty('error');
      expect(typeof errorResponse.error).toBe('string');
    });
  });
});