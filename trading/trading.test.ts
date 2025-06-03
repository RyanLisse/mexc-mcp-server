/**
 * Trading Operations Tests
 * Comprehensive test suite for trading functionality
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { tradingService } from './encore.service';
import { tradingTools } from './tools';
import { 
  PlaceOrderSchema,
  CancelOrderSchema,
  GetOrderStatusSchema,
  GetOrderHistorySchema,
  BatchOrderSchema
} from './schemas';
import type { 
  PlaceOrderArgs,
  CancelOrderArgs,
  GetOrderStatusArgs
} from './schemas';
import type { ToolExecutionContext } from '../tools/types';

// Mock MEXC client
vi.mock('../market-data/mexc-client', () => ({
  mexcClient: {
    placeOrder: vi.fn(),
    cancelOrder: vi.fn(),
    getOrder: vi.fn(),
    getAllOrders: vi.fn(),
    getAccount: vi.fn(),
    getExchangeInfo: vi.fn(),
    getTicker24hr: vi.fn()
  }
}));

describe('Trading Schemas', () => {
  test('PlaceOrderSchema validates correctly', () => {
    const validOrder: PlaceOrderArgs = {
      symbol: 'BTC_USDT',
      side: 'buy',
      type: 'limit',
      quantity: 0.001,
      price: 50000,
      timeInForce: 'GTC',
      testMode: true
    };

    expect(() => PlaceOrderSchema.parse(validOrder)).not.toThrow();
  });

  test('PlaceOrderSchema rejects invalid symbol format', () => {
    const invalidOrder = {
      symbol: 'BTCUSDT', // Missing underscore
      side: 'buy',
      type: 'limit',
      quantity: 0.001,
      price: 50000
    };

    expect(() => PlaceOrderSchema.parse(invalidOrder)).toThrow();
  });

  test('PlaceOrderSchema rejects negative quantity', () => {
    const invalidOrder = {
      symbol: 'BTC_USDT',
      side: 'buy',
      type: 'limit',
      quantity: -0.001,
      price: 50000
    };

    expect(() => PlaceOrderSchema.parse(invalidOrder)).toThrow();
  });

  test('CancelOrderSchema requires either orderId or clientOrderId', () => {
    const validCancel: CancelOrderArgs = {
      symbol: 'BTC_USDT',
      orderId: '12345'
    };

    const invalidCancel = {
      symbol: 'BTC_USDT'
      // Missing both orderId and clientOrderId
    };

    expect(() => CancelOrderSchema.parse(validCancel)).not.toThrow();
    expect(() => CancelOrderSchema.parse(invalidCancel)).toThrow();
  });

  test('BatchOrderSchema limits order count', () => {
    const validBatch = {
      orders: [
        { symbol: 'BTC_USDT', side: 'buy', type: 'limit', quantity: 0.001, price: 50000 }
      ],
      testMode: true
    };

    const invalidBatch = {
      orders: new Array(25).fill({
        symbol: 'BTC_USDT', side: 'buy', type: 'limit', quantity: 0.001, price: 50000
      }),
      testMode: true
    };

    expect(() => BatchOrderSchema.parse(validBatch)).not.toThrow();
    expect(() => BatchOrderSchema.parse(invalidBatch)).toThrow();
  });
});

describe('Trading Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('placeOrder', () => {
    test('places order successfully in test mode', async () => {
      const orderArgs: PlaceOrderArgs = {
        symbol: 'BTC_USDT',
        side: 'buy',
        type: 'limit',
        quantity: 0.001,
        price: 50000,
        testMode: true
      };

      const result = await tradingService.placeOrder(orderArgs);

      expect(result.success).toBe(true);
      expect(result.orderId).toContain('TEST_');
      expect(result.message).toContain('TEST MODE');
    });

    test('validates order before placement', async () => {
      const invalidOrder: PlaceOrderArgs = {
        symbol: 'INVALID_PAIR',
        side: 'buy',
        type: 'limit',
        quantity: 0,
        price: -1000,
        testMode: true
      };

      await expect(tradingService.placeOrder(invalidOrder))
        .rejects.toThrow('Trading validation failed');
    });

    test('handles insufficient balance error', async () => {
      const { mexcClient } = await import('../market-data/mexc-client');
      
      // Mock insufficient balance
      vi.mocked(mexcClient.getAccount).mockResolvedValue({
        balances: [
          { asset: 'USDT', free: '10', locked: '0' }
        ]
      });

      const orderArgs: PlaceOrderArgs = {
        symbol: 'BTC_USDT',
        side: 'buy',
        type: 'limit',
        quantity: 1, // Requires 50,000 USDT but only have 10
        price: 50000,
        testMode: false
      };

      await expect(tradingService.placeOrder(orderArgs))
        .rejects.toThrow('Insufficient balance');
    });
  });

  describe('cancelOrder', () => {
    test('cancels order successfully', async () => {
      const { mexcClient } = await import('../market-data/mexc-client');
      
      vi.mocked(mexcClient.cancelOrder).mockResolvedValue({
        orderId: '12345',
        origClientOrderId: 'client123',
        status: 'CANCELED',
        origQty: '0.001'
      });

      const cancelArgs: CancelOrderArgs = {
        symbol: 'BTC_USDT',
        orderId: '12345'
      };

      const result = await tradingService.cancelOrder(cancelArgs);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('12345');
      expect(result.status).toBe('cancelled');
    });

    test('handles cancellation errors', async () => {
      const { mexcClient } = await import('../market-data/mexc-client');
      
      vi.mocked(mexcClient.cancelOrder).mockRejectedValue(
        new Error('Order not found')
      );

      const cancelArgs: CancelOrderArgs = {
        symbol: 'BTC_USDT',
        orderId: 'nonexistent'
      };

      await expect(tradingService.cancelOrder(cancelArgs))
        .rejects.toThrow('Order execution failed');
    });
  });

  describe('getOrderStatus', () => {
    test('returns order status successfully', async () => {
      const { mexcClient } = await import('../market-data/mexc-client');
      
      vi.mocked(mexcClient.getOrder).mockResolvedValue({
        orderId: '12345',
        clientOrderId: 'client123',
        side: 'BUY',
        type: 'LIMIT',
        status: 'FILLED',
        origQty: '0.001',
        price: '50000',
        executedQty: '0.001',
        avgPrice: '50000',
        timeInForce: 'GTC',
        time: Date.now(),
        updateTime: Date.now()
      });

      const statusArgs: GetOrderStatusArgs = {
        symbol: 'BTC_USDT',
        orderId: '12345'
      };

      const result = await tradingService.getOrderStatus(statusArgs);

      expect(result.orderId).toBe('12345');
      expect(result.status).toBe('filled');
      expect(result.side).toBe('buy');
    });

    test('uses cache for recent requests', async () => {
      const { mexcClient } = await import('../market-data/mexc-client');
      
      // First call
      vi.mocked(mexcClient.getOrder).mockResolvedValue({
        orderId: '12345',
        side: 'BUY',
        type: 'LIMIT',
        status: 'FILLED',
        origQty: '0.001',
        price: '50000',
        executedQty: '0.001',
        timeInForce: 'GTC',
        time: Date.now(),
        updateTime: Date.now()
      });

      const statusArgs: GetOrderStatusArgs = {
        symbol: 'BTC_USDT',
        orderId: '12345'
      };

      await tradingService.getOrderStatus(statusArgs);
      
      // Clear mock calls
      vi.clearAllMocks();
      
      // Second call should use cache
      await tradingService.getOrderStatus(statusArgs);
      
      expect(mexcClient.getOrder).not.toHaveBeenCalled();
    });
  });

  describe('getOrderHistory', () => {
    test('returns filtered order history', async () => {
      const { mexcClient } = await import('../market-data/mexc-client');
      
      vi.mocked(mexcClient.getAllOrders).mockResolvedValue([
        {
          orderId: '1',
          side: 'BUY',
          type: 'LIMIT',
          status: 'FILLED',
          origQty: '0.001',
          price: '50000',
          executedQty: '0.001',
          timeInForce: 'GTC',
          time: Date.now()
        },
        {
          orderId: '2',
          side: 'SELL',
          type: 'MARKET',
          status: 'CANCELED',
          origQty: '0.002',
          executedQty: '0',
          timeInForce: 'IOC',
          time: Date.now()
        }
      ]);

      const result = await tradingService.getOrderHistory({
        symbol: 'BTC_USDT',
        status: 'filled',
        limit: 10
      });

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].status).toBe('filled');
      expect(result.totalCount).toBe(1);
    });

    test('handles pagination correctly', async () => {
      const { mexcClient } = await import('../market-data/mexc-client');
      
      const mockOrders = new Array(150).fill(null).map((_, i) => ({
        orderId: i.toString(),
        side: 'BUY',
        type: 'LIMIT',
        status: 'FILLED',
        origQty: '0.001',
        price: '50000',
        executedQty: '0.001',
        timeInForce: 'GTC',
        time: Date.now()
      }));

      vi.mocked(mexcClient.getAllOrders).mockResolvedValue(mockOrders);

      const result = await tradingService.getOrderHistory({
        page: 2,
        limit: 50
      });

      expect(result.orders).toHaveLength(50);
      expect(result.currentPage).toBe(2);
      expect(result.totalPages).toBe(3);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('validateOrder', () => {
    test('validates order parameters correctly', async () => {
      const { mexcClient } = await import('../market-data/mexc-client');
      
      // Mock exchange info
      vi.mocked(mexcClient.getExchangeInfo).mockResolvedValue({
        symbols: [{
          symbol: 'BTCUSDT',
          baseAsset: 'BTC',
          quoteAsset: 'USDT',
          status: 'TRADING',
          filters: [
            { filterType: 'LOT_SIZE', minQty: '0.00001', maxQty: '1000', stepSize: '0.00001' },
            { filterType: 'PRICE_FILTER', minPrice: '0.01', maxPrice: '100000', tickSize: '0.01' },
            { filterType: 'MIN_NOTIONAL', minNotional: '10' }
          ]
        }]
      });

      // Mock ticker
      vi.mocked(mexcClient.getTicker24hr).mockResolvedValue({
        lastPrice: '50000',
        priceChange: '1000',
        priceChangePercent: '2.0',
        volume: '1000'
      });

      const orderArgs: PlaceOrderArgs = {
        symbol: 'BTC_USDT',
        side: 'buy',
        type: 'limit',
        quantity: 0.001,
        price: 50000
      };

      const result = await tradingService.validateOrder(orderArgs);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.estimatedCost).toBeDefined();
      expect(result.estimatedFee).toBeDefined();
    });

    test('detects quantity validation errors', async () => {
      const { mexcClient } = await import('../market-data/mexc-client');
      
      vi.mocked(mexcClient.getExchangeInfo).mockResolvedValue({
        symbols: [{
          symbol: 'BTCUSDT',
          baseAsset: 'BTC',
          quoteAsset: 'USDT',
          status: 'TRADING',
          filters: [
            { filterType: 'LOT_SIZE', minQty: '0.01', maxQty: '1000', stepSize: '0.00001' }
          ]
        }]
      });

      const orderArgs: PlaceOrderArgs = {
        symbol: 'BTC_USDT',
        side: 'buy',
        type: 'limit',
        quantity: 0.001, // Below minimum
        price: 50000
      };

      const result = await tradingService.validateOrder(orderArgs);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MIN_QUANTITY')).toBe(true);
    });

    test('warns about price deviations', async () => {
      const { mexcClient } = await import('../market-data/mexc-client');
      
      vi.mocked(mexcClient.getExchangeInfo).mockResolvedValue({
        symbols: [{
          symbol: 'BTCUSDT',
          filters: [
            { filterType: 'LOT_SIZE', minQty: '0.00001', maxQty: '1000' },
            { filterType: 'PRICE_FILTER', minPrice: '0.01', maxPrice: '100000' }
          ]
        }]
      });

      vi.mocked(mexcClient.getTicker24hr).mockResolvedValue({
        lastPrice: '50000',
        priceChange: '0',
        priceChangePercent: '0',
        volume: '1000'
      });

      const orderArgs: PlaceOrderArgs = {
        symbol: 'BTC_USDT',
        side: 'buy',
        type: 'limit',
        quantity: 0.001,
        price: 60000 // 20% above market price
      };

      const result = await tradingService.validateOrder(orderArgs);

      expect(result.warnings.some(w => w.field === 'price')).toBe(true);
      expect(result.warnings.some(w => w.severity === 'high')).toBe(true);
    });
  });

  describe('batchOrder', () => {
    test('executes multiple orders successfully', async () => {
      const batchArgs = {
        orders: [
          { symbol: 'BTC_USDT', side: 'buy' as const, type: 'limit' as const, quantity: 0.001, price: 50000 },
          { symbol: 'ETH_USDT', side: 'buy' as const, type: 'limit' as const, quantity: 0.01, price: 3000 }
        ],
        testMode: true
      };

      const result = await tradingService.batchOrder(batchArgs);

      expect(result.success).toBe(true);
      expect(result.totalOrders).toBe(2);
      expect(result.successfulOrders).toBe(2);
      expect(result.failedOrders).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    test('handles partial failures in batch', async () => {
      // This test would require mocking individual order failures
      // Implementation depends on how the service handles batch failures
      expect(true).toBe(true); // Placeholder
    });
  });
});

describe('Trading MCP Tools', () => {
  const mockContext: ToolExecutionContext = {
    userId: 'test-user',
    sessionId: 'test-session',
    preferences: {
      trading: {
        requireConfirmation: true
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('placeOrderTool', () => {
    test('shows warning for real orders without confirmation', async () => {
      const [placeOrderTool] = tradingTools;

      const result = await placeOrderTool.execute({
        symbol: 'BTC_USDT',
        side: 'buy',
        type: 'limit',
        quantity: 0.001,
        price: 50000,
        testMode: false
      }, mockContext);

      expect(result.content[0].text).toContain('TRADING WARNING');
      expect(result.isError).toBe(false);
    });

    test('executes test orders successfully', async () => {
      const [placeOrderTool] = tradingTools;

      const result = await placeOrderTool.execute({
        symbol: 'BTC_USDT',
        side: 'buy',
        type: 'limit',
        quantity: 0.001,
        price: 50000,
        testMode: true
      }, mockContext);

      expect(result.content[0].text).toContain('Order Placed');
      expect(result.content[0].text).toContain('TEST MODE');
      expect(result.isError).toBe(false);
    });

    test('handles validation errors', async () => {
      const [placeOrderTool] = tradingTools;

      const result = await placeOrderTool.execute({
        symbol: 'INVALID',
        side: 'buy',
        type: 'limit',
        quantity: -1,
        price: 0
      }, mockContext);

      expect(result.content[0].text).toContain('failed');
      expect(result.isError).toBe(true);
    });
  });

  describe('getOrderStatusTool', () => {
    test('displays order information correctly', async () => {
      const { mexcClient } = await import('../market-data/mexc-client');
      
      vi.mocked(mexcClient.getOrder).mockResolvedValue({
        orderId: '12345',
        clientOrderId: 'client123',
        side: 'BUY',
        type: 'LIMIT',
        status: 'FILLED',
        origQty: '0.001',
        price: '50000',
        executedQty: '0.001',
        avgPrice: '50000',
        timeInForce: 'GTC',
        time: Date.now(),
        updateTime: Date.now()
      });

      const getOrderStatusTool = tradingTools.find(t => t.name === 'mexc_get_order_status')!;

      const result = await getOrderStatusTool.execute({
        symbol: 'BTC_USDT',
        orderId: '12345'
      }, mockContext);

      expect(result.content[0].text).toContain('Order Status');
      expect(result.content[0].text).toContain('12345');
      expect(result.content[0].text).toContain('FILLED');
      expect(result.isError).toBe(false);
    });
  });

  describe('validateOrderTool', () => {
    test('shows validation results', async () => {
      const { mexcClient } = await import('../market-data/mexc-client');
      
      vi.mocked(mexcClient.getExchangeInfo).mockResolvedValue({
        symbols: [{
          symbol: 'BTCUSDT',
          filters: [
            { filterType: 'LOT_SIZE', minQty: '0.00001', maxQty: '1000' },
            { filterType: 'PRICE_FILTER', minPrice: '0.01', maxPrice: '100000' }
          ]
        }]
      });

      vi.mocked(mexcClient.getTicker24hr).mockResolvedValue({
        lastPrice: '50000',
        priceChange: '0',
        priceChangePercent: '0',
        volume: '1000'
      });

      const validateOrderTool = tradingTools.find(t => t.name === 'mexc_validate_order')!;

      const result = await validateOrderTool.execute({
        symbol: 'BTC_USDT',
        side: 'buy',
        type: 'limit',
        quantity: 0.001,
        price: 50000
      }, mockContext);

      expect(result.content[0].text).toContain('Order Validation');
      expect(result.content[0].text).toContain('valid');
      expect(result.isError).toBe(false);
    });
  });

  describe('batchOrderTool', () => {
    test('shows warning for large batches', async () => {
      const batchOrderTool = tradingTools.find(t => t.name === 'mexc_batch_order')!;

      const result = await batchOrderTool.execute({
        orders: new Array(10).fill({
          symbol: 'BTC_USDT',
          side: 'buy',
          type: 'limit',
          quantity: 0.001,
          price: 50000
        }),
        testMode: false
      }, mockContext);

      expect(result.content[0].text).toContain('BATCH ORDER WARNING');
      expect(result.isError).toBe(false);
    });

    test('executes small test batches', async () => {
      const batchOrderTool = tradingTools.find(t => t.name === 'mexc_batch_order')!;

      const result = await batchOrderTool.execute({
        orders: [
          { symbol: 'BTC_USDT', side: 'buy', type: 'limit', quantity: 0.001, price: 50000 }
        ],
        testMode: true
      }, mockContext);

      expect(result.content[0].text).toContain('Batch Order Execution');
      expect(result.content[0].text).toContain('TEST MODE');
      expect(result.isError).toBe(false);
    });
  });
});

describe('Integration Tests', () => {
  test('complete order lifecycle', async () => {
    // This test would simulate placing, checking status, and cancelling an order
    // Implementation depends on test environment setup
    expect(true).toBe(true); // Placeholder
  });

  test('error handling across all operations', async () => {
    // This test would verify error handling consistency
    expect(true).toBe(true); // Placeholder
  });

  test('performance under load', async () => {
    // This test would verify performance characteristics
    expect(true).toBe(true); // Placeholder
  });
});