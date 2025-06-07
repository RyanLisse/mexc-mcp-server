/**
 * Task #13: Advanced Order Types Tests
 * TDD tests for implementing stop-loss, take-profit, and OCO order types
 * Requirements:
 * - Extend order placement API to support advanced types
 * - Validate inputs with Encore validation
 * - Call MEXC REST API accordingly
 * - Example: type: 'stop_loss', 'take_profit', 'oco'
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Logger,
  type MexcClient,
  type OCOOrderArgs,
  type StopLossOrderArgs,
  type TakeProfitOrderArgs,
  TaskThirteenAdvancedOrderService,
} from '../task-13-advanced-order-service';

// Mock implementations
const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

const mockMexcClient: MexcClient = {
  placeOrder: vi.fn(),
  placeStopLossOrder: vi.fn(),
  placeTakeProfitOrder: vi.fn(),
  placeOCOOrder: vi.fn(),
  getOrderStatus: vi.fn(),
  cancelOrder: vi.fn(),
  getCurrentPrice: vi.fn(),
  getAccountInfo: vi.fn(),
};

describe('Task #13: Advanced Order Types Implementation', () => {
  let advancedOrderService: TaskThirteenAdvancedOrderService;

  const mockStopLossOrder: StopLossOrderArgs = {
    symbol: 'BTCUSDT',
    side: 'sell',
    type: 'stop_loss',
    quantity: 0.001,
    stopPrice: 45000.0,
    timeInForce: 'GTC',
    clientOrderId: 'stop_loss_001',
    testMode: true,
  };

  const mockTakeProfitOrder: TakeProfitOrderArgs = {
    symbol: 'BTCUSDT',
    side: 'sell',
    type: 'take_profit',
    quantity: 0.001,
    takeProfitPrice: 55000.0,
    timeInForce: 'GTC',
    clientOrderId: 'take_profit_001',
    testMode: true,
  };

  const mockOCOOrder: OCOOrderArgs = {
    symbol: 'BTCUSDT',
    side: 'sell',
    type: 'oco',
    quantity: 0.001,
    stopPrice: 45000.0,
    limitPrice: 55000.0,
    stopLimitPrice: 44500.0,
    timeInForce: 'GTC',
    clientOrderId: 'oco_001',
    testMode: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock responses
    (mockMexcClient.getCurrentPrice as any).mockResolvedValue('50000.00');
    (mockMexcClient.getAccountInfo as any).mockResolvedValue({
      balances: [
        { asset: 'BTC', free: '0.1', locked: '0.0' },
        { asset: 'USDT', free: '100000.0', locked: '0.0' },
      ],
    });
    (mockMexcClient.placeStopLossOrder as any).mockResolvedValue({
      orderId: 'sl_123',
      status: 'NEW',
      symbol: 'BTCUSDT',
      type: 'STOP_LOSS',
    });
    (mockMexcClient.placeTakeProfitOrder as any).mockResolvedValue({
      orderId: 'tp_123',
      status: 'NEW',
      symbol: 'BTCUSDT',
      type: 'TAKE_PROFIT',
    });
    (mockMexcClient.placeOCOOrder as any).mockResolvedValue({
      orderListId: 'oco_123',
      orders: [
        { orderId: 'oco_stop_123', type: 'STOP_LOSS_LIMIT' },
        { orderId: 'oco_limit_123', type: 'LIMIT_MAKER' },
      ],
    });

    advancedOrderService = new TaskThirteenAdvancedOrderService(mockLogger, mockMexcClient);
  });

  describe('Stop-Loss Order Implementation', () => {
    it('should validate stop-loss order structure', async () => {
      const result = await advancedOrderService.validateAdvancedOrder(mockStopLossOrder);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.orderType).toBe('stop_loss');
    });

    it('should place stop-loss order successfully', async () => {
      const result = await advancedOrderService.placeAdvancedOrder(mockStopLossOrder);

      expect(result.success).toBe(true);
      expect(result.data?.orderId).toBeDefined();
      expect(result.data?.type).toBe('stop_loss');
      expect(mockMexcClient.placeStopLossOrder).toHaveBeenCalledWith({
        symbol: 'BTCUSDT',
        side: 'SELL',
        quantity: '0.001',
        stopPrice: '45000.00',
        timeInForce: 'GTC',
      });
    });

    it('should reject stop-loss with invalid trigger price', async () => {
      const invalidOrder = {
        ...mockStopLossOrder,
        stopPrice: 60000.0, // Above current price for sell order (invalid)
      };

      const result = await advancedOrderService.validateAdvancedOrder(invalidOrder);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'stopPrice')).toBe(true);
      expect(result.errors[0].message).toContain(
        'Stop price must be below current price for sell orders'
      );
    });

    it('should validate stop-loss price relationships for buy orders', async () => {
      const buyStopLoss = {
        ...mockStopLossOrder,
        side: 'buy' as const,
        stopPrice: 55000.0, // Above current price for buy order (valid)
      };

      const result = await advancedOrderService.validateAdvancedOrder(buyStopLoss);

      expect(result.isValid).toBe(true);
    });

    it('should handle MEXC API errors for stop-loss orders', async () => {
      (mockMexcClient.placeStopLossOrder as any).mockRejectedValue(
        new Error('Insufficient balance')
      );

      const result = await advancedOrderService.placeAdvancedOrder(mockStopLossOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient balance');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Take-Profit Order Implementation', () => {
    it('should validate take-profit order structure', async () => {
      const result = await advancedOrderService.validateAdvancedOrder(mockTakeProfitOrder);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.orderType).toBe('take_profit');
    });

    it('should place take-profit order successfully', async () => {
      const result = await advancedOrderService.placeAdvancedOrder(mockTakeProfitOrder);

      expect(result.success).toBe(true);
      expect(result.data?.orderId).toBeDefined();
      expect(result.data?.type).toBe('take_profit');
      expect(mockMexcClient.placeTakeProfitOrder).toHaveBeenCalledWith({
        symbol: 'BTCUSDT',
        side: 'SELL',
        quantity: '0.001',
        takeProfitPrice: '55000.00',
        timeInForce: 'GTC',
      });
    });

    it('should reject take-profit with invalid target price', async () => {
      const invalidOrder = {
        ...mockTakeProfitOrder,
        takeProfitPrice: 40000.0, // Below current price for sell order (invalid)
      };

      const result = await advancedOrderService.validateAdvancedOrder(invalidOrder);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'takeProfitPrice')).toBe(true);
      expect(result.errors[0].message).toContain(
        'Take profit price must be above current price for sell orders'
      );
    });

    it('should validate take-profit price relationships for buy orders', async () => {
      const buyTakeProfit = {
        ...mockTakeProfitOrder,
        side: 'buy' as const,
        takeProfitPrice: 45000.0, // Below current price for buy order (valid)
      };

      const result = await advancedOrderService.validateAdvancedOrder(buyTakeProfit);

      expect(result.isValid).toBe(true);
    });
  });

  describe('OCO (One-Cancels-Other) Order Implementation', () => {
    it('should validate OCO order structure', async () => {
      const result = await advancedOrderService.validateAdvancedOrder(mockOCOOrder);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.orderType).toBe('oco');
    });

    it('should place OCO order successfully', async () => {
      const result = await advancedOrderService.placeAdvancedOrder(mockOCOOrder);

      expect(result.success).toBe(true);
      expect(result.data?.orderListId).toBeDefined();
      expect(result.data?.type).toBe('oco');
      expect(result.data?.linkedOrders).toHaveLength(2);
      expect(mockMexcClient.placeOCOOrder).toHaveBeenCalledWith({
        symbol: 'BTCUSDT',
        side: 'SELL',
        quantity: '0.001',
        price: '55000.00',
        stopPrice: '45000.00',
        stopLimitPrice: '44500.00',
        timeInForce: 'GTC',
      });
    });

    it('should validate OCO price relationships', async () => {
      const invalidOCO = {
        ...mockOCOOrder,
        stopPrice: 56000.0, // Stop price above limit price (invalid)
      };

      const result = await advancedOrderService.validateAdvancedOrder(invalidOCO);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'priceRelationship')).toBe(true);
      expect(result.errors[0].message).toContain(
        'Stop price must be below limit price for sell OCO orders'
      );
    });

    it('should validate stop limit price in OCO orders', async () => {
      const invalidOCO = {
        ...mockOCOOrder,
        stopLimitPrice: 46000.0, // Stop limit price above stop price (invalid)
      };

      const result = await advancedOrderService.validateAdvancedOrder(invalidOCO);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'stopLimitPrice')).toBe(true);
    });

    it('should handle OCO order execution and linking', async () => {
      const result = await advancedOrderService.placeAdvancedOrder(mockOCOOrder);

      expect(result.success).toBe(true);
      expect(result.data?.linkedOrders).toEqual([
        { orderId: 'oco_stop_123', type: 'STOP_LOSS_LIMIT' },
        { orderId: 'oco_limit_123', type: 'LIMIT_MAKER' },
      ]);
    });
  });

  describe('Advanced Order Validation Logic', () => {
    it('should validate required fields for each order type', async () => {
      const incompleteStopLoss = {
        symbol: 'BTCUSDT',
        side: 'sell',
        type: 'stop_loss',
        quantity: 0.001,
        // Missing stopPrice
      };

      const result = await advancedOrderService.validateAdvancedOrder(incompleteStopLoss as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'stopPrice')).toBe(true);
    });

    it('should validate quantity precision', async () => {
      const invalidQuantity = {
        ...mockStopLossOrder,
        quantity: 0.0000001, // Too small quantity
      };

      const result = await advancedOrderService.validateAdvancedOrder(invalidQuantity);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'quantity')).toBe(true);
    });

    it('should check account balance before placing orders', async () => {
      (mockMexcClient.getAccountInfo as any).mockResolvedValue({
        balances: [{ asset: 'BTC', free: '0.0001', locked: '0.0' }], // Insufficient balance
      });

      const result = await advancedOrderService.validateAdvancedOrder(mockStopLossOrder);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'balance')).toBe(true);
      expect(result.errors[0].message).toContain('Insufficient balance');
    });

    it('should validate symbol format and existence', async () => {
      const invalidSymbol = {
        ...mockStopLossOrder,
        symbol: 'INVALID',
      };

      const result = await advancedOrderService.validateAdvancedOrder(invalidSymbol);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'symbol')).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      (mockMexcClient.getCurrentPrice as any).mockRejectedValue(new Error('Network timeout'));

      const result = await advancedOrderService.validateAdvancedOrder(mockStopLossOrder);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Network timeout'))).toBe(true);
    });

    it('should handle MEXC API rate limiting', async () => {
      (mockMexcClient.placeStopLossOrder as any).mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      const result = await advancedOrderService.placeAdvancedOrder(mockStopLossOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
      expect(result.retryAfter).toBeDefined();
    });

    it('should provide detailed error messages for validation failures', async () => {
      const multipleErrors = {
        symbol: '', // Invalid
        side: 'invalid' as any, // Invalid
        type: 'stop_loss' as const,
        quantity: -1, // Invalid
        stopPrice: -100, // Invalid
      };

      const result = await advancedOrderService.validateAdvancedOrder(multipleErrors);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
      expect(result.errors.every((e) => e.field && e.message)).toBe(true);
    });
  });

  describe('Advanced Order Features', () => {
    it('should support trailing stop functionality', async () => {
      const trailingStopOrder = {
        ...mockStopLossOrder,
        type: 'trailing_stop' as const,
        trailingPercent: 2.5, // 2.5% trailing stop
      };

      const result = await advancedOrderService.validateAdvancedOrder(trailingStopOrder);

      expect(result.isValid).toBe(true);
      expect(result.orderType).toBe('trailing_stop');
    });

    it('should calculate order costs and fees accurately', async () => {
      const result = await advancedOrderService.calculateOrderCost(mockOCOOrder);

      expect(result.estimatedCost).toBeDefined();
      expect(result.estimatedFee).toBeDefined();
      expect(result.totalCost).toBeDefined();
      expect(Number(result.totalCost)).toBeGreaterThan(Number(result.estimatedCost));
    });

    it('should support conditional order logic', async () => {
      const conditionalOrder = {
        ...mockStopLossOrder,
        conditions: {
          priceCondition: { operator: '>=', value: 51000 },
          timeCondition: { validAfter: Date.now() + 3600000 }, // Valid after 1 hour
        },
      };

      const result = await advancedOrderService.validateAdvancedOrder(conditionalOrder);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.message.includes('conditional order'))).toBe(true);
    });
  });

  describe('Integration with Existing System', () => {
    it('should maintain compatibility with existing order types', async () => {
      const standardOrder = {
        symbol: 'BTCUSDT',
        side: 'buy' as const,
        type: 'limit' as const,
        quantity: 0.001,
        price: 49000.0,
        timeInForce: 'GTC' as const,
      };

      const result = await advancedOrderService.validateAdvancedOrder(standardOrder);

      expect(result.isValid).toBe(true);
      expect(result.orderType).toBe('limit');
    });

    it('should log all advanced order activities', async () => {
      await advancedOrderService.placeAdvancedOrder(mockStopLossOrder);

      expect(mockLogger.info).toHaveBeenCalledWith('Placing advanced order', {
        type: 'stop_loss',
        symbol: 'BTCUSDT',
        side: 'sell',
        quantity: '0.001',
      });
    });

    it('should provide order status tracking for advanced orders', async () => {
      (mockMexcClient.getOrderStatus as any).mockResolvedValue({
        orderId: 'sl_123',
        status: 'FILLED',
        executedQty: '0.001',
        avgPrice: '45000.00',
      });

      const result = await advancedOrderService.getAdvancedOrderStatus('sl_123', 'BTCUSDT');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('FILLED');
      expect(result.data?.orderType).toBe('stop_loss');
    });
  });

  describe('Performance and Safety', () => {
    it('should validate orders within acceptable time limits', async () => {
      const startTime = Date.now();
      await advancedOrderService.validateAdvancedOrder(mockStopLossOrder);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should respect test mode for advanced orders', async () => {
      const testOrder = { ...mockOCOOrder, testMode: true };

      const result = await advancedOrderService.placeAdvancedOrder(testOrder);

      expect(result.success).toBe(true);
      expect(result.data?.testMode).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('TEST MODE'),
        expect.any(Object)
      );
    });

    it('should implement proper risk management for large orders', async () => {
      const largeOrder = {
        ...mockStopLossOrder,
        quantity: 10.0, // Large quantity
      };

      const result = await advancedOrderService.validateAdvancedOrder(largeOrder);

      expect(result.warnings.some((w) => w.severity === 'high')).toBe(true);
      expect(result.warnings.some((w) => w.message.includes('large order'))).toBe(true);
    });
  });
});
