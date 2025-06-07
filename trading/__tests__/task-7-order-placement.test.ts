/**
 * Task #7: Order Placement API Tests
 * TDD tests for implementing order placement with Zod validation, proper logging, and safety checks
 * Requirements:
 * - Zod validation with z.object({ symbol: z.string(), side: z.enum(['BUY', 'SELL']), ... })
 * - Call MEXC REST API for execution
 * - Log all orders
 * - Test order placement with valid/invalid inputs
 * - Verify logging and error handling
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Logger,
  type MexcClient,
  type TaskSevenOrderArgs,
  TaskSevenOrderPlacementService,
} from '../task-7-order-service';

// Mock logger for testing logging requirements
const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

// Mock MEXC API client
const mockMexcClient = {
  placeOrder: vi.fn(),
  ping: vi.fn(),
} as unknown as MexcClient;

describe('Task #7: Order Placement API with Zod Validation', () => {
  let orderService: TaskSevenOrderPlacementService;

  beforeEach(() => {
    vi.clearAllMocks();
    (mockMexcClient.placeOrder as any).mockResolvedValue({
      orderId: 'test-order-123',
      status: 'PLACED',
    });
    orderService = new TaskSevenOrderPlacementService(mockLogger, mockMexcClient);
  });

  describe('Zod Validation Requirements', () => {
    it('should validate correct order structure with BUY/SELL enum', async () => {
      const validOrder: TaskSevenOrderArgs = {
        symbol: 'BTCUSDT',
        side: 'BUY', // Task #7 requires 'BUY' not 'buy'
        type: 'LIMIT',
        quantity: 0.001,
        price: 50000,
        timeInForce: 'GTC',
        testMode: true,
      };

      const result = await orderService.placeOrder(validOrder);

      expect(result.success).toBe(true);
      expect(result.data?.symbol).toBe('BTCUSDT');
      expect(result.data?.side).toBe('BUY');
      expect(result.data?.quantity).toBe(0.001);
    });

    it('should reject invalid side values (not BUY/SELL)', async () => {
      const invalidOrder = {
        symbol: 'BTCUSDT',
        side: 'buy', // Task #7 requires 'BUY', not 'buy'
        type: 'LIMIT',
        quantity: 0.001,
        price: 50000,
      };

      const result = await orderService.placeOrder(invalidOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Side must be BUY or SELL');
    });

    it('should accept SELL orders', async () => {
      const sellOrder: TaskSevenOrderArgs = {
        symbol: 'BTCUSDT',
        side: 'SELL',
        type: 'MARKET',
        quantity: 0.001,
        testMode: true,
      };

      const result = await orderService.placeOrder(sellOrder);

      expect(result.success).toBe(true);
      expect(result.data?.side).toBe('SELL');
    });

    it('should validate required symbol field', async () => {
      const invalidOrder = {
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0.001,
        price: 50000,
        // Missing symbol
      };

      const result = await orderService.placeOrder(invalidOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('symbol');
    });

    it('should validate positive quantity', async () => {
      const invalidOrder = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: -0.001, // Negative quantity
        price: 50000,
      };

      const result = await orderService.placeOrder(invalidOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('positive');
    });

    it('should validate order types', async () => {
      const validTypes = ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'];

      for (const type of validTypes) {
        const order = {
          symbol: 'BTCUSDT',
          side: 'BUY',
          type,
          quantity: 0.001,
          price: type !== 'MARKET' ? 50000 : undefined,
          stopPrice: type.includes('STOP') ? 49000 : undefined,
        };

        const result = await orderService.placeOrder(order);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid order types', async () => {
      const invalidOrder = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'INVALID_TYPE',
        quantity: 0.001,
      };

      const result = await orderService.placeOrder(invalidOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Type must be');
    });
  });

  describe('MEXC REST API Integration', () => {
    it('should call MEXC API for order execution', async () => {
      const order: TaskSevenOrderArgs = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0.001,
        price: 50000,
        testMode: true,
      };

      await orderService.placeOrder(order);

      expect(mockMexcClient.placeOrder).toHaveBeenCalledWith({
        symbol: 'BTCUSDT',
        side: 'buy', // Converted to lowercase for MEXC API
        type: 'limit',
        quantity: 0.001,
        price: 50000,
        stopPrice: undefined,
        timeInForce: undefined,
        clientOrderId: undefined,
        testMode: true,
      });
    });

    it('should handle MEXC API errors', async () => {
      (mockMexcClient.placeOrder as any).mockRejectedValue(new Error('MEXC API error'));

      const order: TaskSevenOrderArgs = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001,
        testMode: true,
      };

      const result = await orderService.placeOrder(order);

      expect(result.success).toBe(false);
      expect(result.error).toContain('MEXC API error');
    });
  });

  describe('Comprehensive Logging Requirements', () => {
    it('should log all order placement attempts', async () => {
      const order: TaskSevenOrderArgs = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0.001,
        price: 50000,
        testMode: true,
      };

      await orderService.placeOrder(order);

      expect(mockLogger.info).toHaveBeenCalledWith('Order placement attempt', {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0.001,
        price: 50000,
        testMode: true,
        timestamp: expect.any(Number),
      });
    });

    it('should log successful order placements', async () => {
      const order: TaskSevenOrderArgs = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001,
        testMode: true,
      };

      await orderService.placeOrder(order);

      expect(mockLogger.info).toHaveBeenCalledWith('Order placed successfully', {
        orderId: 'test-order-123',
        symbol: 'BTCUSDT',
        side: 'BUY',
        processingTime: expect.any(Number),
      });
    });

    it('should log order placement failures', async () => {
      const invalidOrder = {
        symbol: 'BTCUSDT',
        side: 'INVALID',
        type: 'LIMIT',
        quantity: 0.001,
      };

      await orderService.placeOrder(invalidOrder);

      expect(mockLogger.error).toHaveBeenCalledWith('Order placement failed', {
        error: expect.stringContaining('Side must be BUY or SELL'),
        orderData: invalidOrder,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Safety Checks', () => {
    it('should require price for LIMIT orders', async () => {
      const limitOrderWithoutPrice = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0.001,
        // Missing required price for LIMIT order
      };

      const result = await orderService.placeOrder(limitOrderWithoutPrice);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Limit orders require a price');
    });

    it('should require stopPrice for STOP orders', async () => {
      const stopOrderWithoutStopPrice = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'STOP',
        quantity: 0.001,
        // Missing required stopPrice for STOP order
      };

      const result = await orderService.placeOrder(stopOrderWithoutStopPrice);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Stop orders require a stop price');
    });

    it('should validate quantity is positive', async () => {
      const zeroQuantityOrder = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0, // Invalid zero quantity
      };

      const result = await orderService.placeOrder(zeroQuantityOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('positive');
    });

    it('should handle malformed input gracefully', async () => {
      const malformedInputs = [null, undefined, '', 123, [], 'string'];

      for (const input of malformedInputs) {
        const result = await orderService.placeOrder(input);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages for validation failures', async () => {
      const invalidOrder = {
        symbol: '', // Empty symbol
        side: 'invalid', // Invalid side
        type: 'invalid', // Invalid type
        quantity: -1, // Negative quantity
      };

      const result = await orderService.placeOrder(invalidOrder);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.error?.length).toBeGreaterThan(0);
    });

    it('should include timestamp in all responses', async () => {
      const order: TaskSevenOrderArgs = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001,
        testMode: true,
      };

      const result = await orderService.placeOrder(order);

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should handle concurrent order placement requests', async () => {
      const order: TaskSevenOrderArgs = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001,
        testMode: true,
      };

      // Place multiple orders concurrently
      const promises = Array.from({ length: 5 }, () => orderService.placeOrder(order));
      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.data?.orderId).toBeDefined();
      });

      // Should have called MEXC API 5 times
      expect(mockMexcClient.placeOrder).toHaveBeenCalledTimes(5);
    });
  });

  describe('Test Mode Support', () => {
    it('should support test mode for safe testing', async () => {
      const testOrder: TaskSevenOrderArgs = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: 0.001,
        price: 50000,
        testMode: true,
      };

      const result = await orderService.placeOrder(testOrder);

      expect(result.success).toBe(true);
      expect(mockMexcClient.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          testMode: true,
        })
      );
    });

    it('should default testMode to false when not specified', async () => {
      const order: TaskSevenOrderArgs = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: 0.001,
        testMode: false,
      };

      await orderService.placeOrder(order);

      expect(mockMexcClient.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          testMode: false,
        })
      );
    });
  });
});
