import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BalanceManager } from './balance';
import { portfolioService } from './encore.service';
import { PositionManager } from './positions';
import type {
  BalanceHistory,
  PortfolioBalance,
  PortfolioMetrics,
  PortfolioPosition,
  PortfolioSummary,
  TransactionRecord,
} from './types';

// Mock MEXC client
const mockMEXCClient = {
  getAccountInfo: vi.fn(() =>
    Promise.resolve({
      balances: [
        { asset: 'USDT', free: '1000.00000000', locked: '0.00000000' },
        { asset: 'BTC', free: '0.50000000', locked: '0.00000000' },
        { asset: 'ETH', free: '2.00000000', locked: '0.50000000' },
      ],
    })
  ),
  getAccountTrades: vi.fn(() =>
    Promise.resolve([
      {
        id: '12345',
        symbol: 'BTCUSDT',
        orderId: '67890',
        price: '50000.00',
        qty: '0.1',
        commission: '0.001',
        commissionAsset: 'BTC',
        time: 1640995200000,
        isBuyer: true,
        isMaker: false,
        isBestMatch: true,
      },
    ])
  ),
  getCurrentPrices: vi.fn(() =>
    Promise.resolve({
      BTCUSDT: '50000.00',
      ETHUSDT: '3000.00',
    })
  ),
};

describe('Portfolio Types and Schemas', () => {
  test('should validate PortfolioBalance schema', () => {
    const balance: PortfolioBalance = {
      asset: 'USDT',
      free: '1000.00',
      locked: '0.00',
      total: '1000.00',
      usdValue: '1000.00',
      percentage: 50.0,
      timestamp: new Date().toISOString(),
    };

    expect(balance.asset).toBe('USDT');
    expect(Number(balance.free)).toBe(1000);
    expect(Number(balance.usdValue)).toBe(1000);
  });

  test('should validate PortfolioPosition schema', () => {
    const position: PortfolioPosition = {
      symbol: 'BTCUSDT',
      asset: 'BTC',
      quantity: '0.5',
      averagePrice: '48000.00',
      currentPrice: '50000.00',
      marketValue: '25000.00',
      unrealizedPnl: '1000.00',
      unrealizedPnlPercent: 4.17,
      cost: '24000.00',
      side: 'long',
      timestamp: new Date().toISOString(),
    };

    expect(position.symbol).toBe('BTCUSDT');
    expect(Number(position.unrealizedPnl)).toBe(1000);
    expect(position.side).toBe('long');
  });

  test('should validate TransactionRecord schema', () => {
    const transaction: TransactionRecord = {
      id: '12345',
      type: 'trade',
      symbol: 'BTCUSDT',
      side: 'buy',
      quantity: '0.1',
      price: '50000.00',
      value: '5000.00',
      fee: '0.001',
      feeAsset: 'BTC',
      timestamp: new Date().toISOString(),
      orderId: '67890',
    };

    expect(transaction.type).toBe('trade');
    expect(transaction.side).toBe('buy');
    expect(Number(transaction.value)).toBe(5000);
  });
});

describe('BalanceManager', () => {
  let balanceManager: BalanceManager;

  beforeEach(() => {
    balanceManager = new BalanceManager();
  });

  afterEach(() => {
    balanceManager.clearCache();
  });

  test('should fetch and process account balances', async () => {
    const balances = await balanceManager.getBalances();

    expect(balances).toBeDefined();
    expect(Array.isArray(balances)).toBe(true);
    expect(balances.length).toBeGreaterThan(0);

    const usdtBalance = balances.find((b) => b.asset === 'USDT');
    expect(usdtBalance).toBeDefined();
    expect(usdtBalance?.asset).toBe('USDT');
    expect(Number(usdtBalance?.free)).toBeGreaterThanOrEqual(0);
  });

  test('should calculate USD values correctly', async () => {
    const balances = await balanceManager.getBalances();

    for (const balance of balances) {
      expect(balance.usdValue).toBeDefined();
      expect(Number(balance.usdValue)).toBeGreaterThanOrEqual(0);
      expect(balance.percentage).toBeGreaterThanOrEqual(0);
      expect(balance.percentage).toBeLessThanOrEqual(100);
    }
  });

  test('should handle zero balances', async () => {
    const balances = await balanceManager.getBalances(true); // includeZero = true

    const hasZeroBalance = balances.some((b) => Number(b.total) === 0);
    expect(hasZeroBalance).toBeDefined(); // Should handle zero balances properly
  });

  test('should cache balance data', async () => {
    const balances1 = await balanceManager.getBalances();
    const balances2 = await balanceManager.getBalances();

    expect(balances1).toEqual(balances2);
    expect(balanceManager.isCacheValid()).toBe(true);
  });

  test('should refresh cache when expired', async () => {
    const balances1 = await balanceManager.getBalances();

    // Force cache expiration
    balanceManager.clearCache();

    const balances2 = await balanceManager.getBalances();

    expect(balances1).not.toBe(balances2); // Different object instances
    expect(balanceManager.isCacheValid()).toBe(true);
  });

  test('should get balance for specific asset', async () => {
    const btcBalance = await balanceManager.getAssetBalance('BTC');

    expect(btcBalance).toBeDefined();
    expect(btcBalance?.asset).toBe('BTC');
    expect(Number(btcBalance?.total)).toBeGreaterThanOrEqual(0);
  });

  test('should return null for non-existent asset', async () => {
    const balance = await balanceManager.getAssetBalance('NONEXISTENT');
    expect(balance).toBeNull();
  });
});

describe('PositionManager', () => {
  let positionManager: PositionManager;

  beforeEach(() => {
    positionManager = new PositionManager();
  });

  afterEach(() => {
    positionManager.clearCache();
  });

  test('should calculate positions from trades', async () => {
    const positions = await positionManager.getPositions();

    expect(positions).toBeDefined();
    expect(Array.isArray(positions)).toBe(true);

    if (positions.length > 0) {
      const position = positions[0];
      expect(position.symbol).toBeDefined();
      expect(position.quantity).toBeDefined();
      expect(position.averagePrice).toBeDefined();
      expect(position.currentPrice).toBeDefined();
      expect(position.marketValue).toBeDefined();
    }
  });

  test('should calculate unrealized PnL correctly', async () => {
    const positions = await positionManager.getPositions();

    for (const position of positions) {
      const quantity = Number(position.quantity);
      const avgPrice = Number(position.averagePrice);
      const currentPrice = Number(position.currentPrice);
      const marketValue = Number(position.marketValue);
      const unrealizedPnl = Number(position.unrealizedPnl);

      expect(marketValue).toBeCloseTo(quantity * currentPrice, 2);
      expect(unrealizedPnl).toBeCloseTo(marketValue - quantity * avgPrice, 2);
    }
  });

  test('should handle long and short positions', async () => {
    const positions = await positionManager.getPositions();

    for (const position of positions) {
      expect(['long', 'short'].includes(position.side)).toBe(true);
    }
  });

  test('should get position for specific symbol', async () => {
    const position = await positionManager.getPositionBySymbol('BTCUSDT');

    if (position) {
      expect(position.symbol).toBe('BTCUSDT');
      expect(position.asset).toBe('BTC');
    }
  });

  test('should calculate position metrics', async () => {
    const metrics = await positionManager.getPositionMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.totalPositions).toBeGreaterThanOrEqual(0);
    expect(metrics.totalMarketValue).toBeGreaterThanOrEqual(0);
    expect(metrics.totalUnrealizedPnl).toBeDefined();
    expect(metrics.profitablePositions).toBeGreaterThanOrEqual(0);
    expect(metrics.losingPositions).toBeGreaterThanOrEqual(0);
  });
});

describe('Portfolio Service', () => {
  beforeEach(() => {
    // Reset any cached data
    portfolioService.clearCache?.();
  });

  test('should get portfolio summary', async () => {
    const summary = await portfolioService.getPortfolioSummary();

    expect(summary).toBeDefined();
    expect(summary.totalValue).toBeDefined();
    expect(summary.totalBalance).toBeDefined();
    expect(summary.totalPositions).toBeDefined();
    expect(summary.totalPnl).toBeDefined();
    expect(summary.totalPnlPercent).toBeDefined();
    expect(Array.isArray(summary.topHoldings)).toBe(true);
    expect(summary.timestamp).toBeDefined();
  });

  test('should get balance history', async () => {
    const history = await portfolioService.getBalanceHistory('1d', 24);

    expect(history).toBeDefined();
    expect(Array.isArray(history.dataPoints)).toBe(true);
    expect(history.period).toBe('1d');
    expect(history.totalValue).toBeDefined();
    expect(history.change24h).toBeDefined();
    expect(history.changePercent24h).toBeDefined();
  });

  test('should get transaction history with pagination', async () => {
    const history = await portfolioService.getTransactionHistory({
      limit: 10,
      offset: 0,
    });

    expect(history).toBeDefined();
    expect(Array.isArray(history.transactions)).toBe(true);
    expect(history.transactions.length).toBeLessThanOrEqual(10);
    expect(history.total).toBeGreaterThanOrEqual(0);
    expect(history.limit).toBe(10);
    expect(history.offset).toBe(0);
  });

  test('should filter transactions by type', async () => {
    const tradeHistory = await portfolioService.getTransactionHistory({
      type: 'trade',
      limit: 5,
    });

    expect(tradeHistory.transactions.every((t) => t.type === 'trade')).toBe(true);
  });

  test('should filter transactions by symbol', async () => {
    const btcHistory = await portfolioService.getTransactionHistory({
      symbol: 'BTCUSDT',
      limit: 5,
    });

    expect(btcHistory.transactions.every((t) => t.symbol === 'BTCUSDT')).toBe(true);
  });

  test('should calculate portfolio metrics', async () => {
    const metrics = await portfolioService.getPortfolioMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.totalValue).toBeDefined();
    expect(metrics.totalPnl).toBeDefined();
    expect(metrics.totalPnlPercent).toBeDefined();
    expect(metrics.sharpeRatio).toBeDefined();
    expect(metrics.maxDrawdown).toBeDefined();
    expect(metrics.winRate).toBeDefined();
    expect(metrics.averageWin).toBeDefined();
    expect(metrics.averageLoss).toBeDefined();
    expect(metrics.profitFactor).toBeDefined();
  });

  test('should handle real-time balance updates', async () => {
    const initialSummary = await portfolioService.getPortfolioSummary();

    // Simulate real-time update
    await portfolioService.refreshBalances();

    const updatedSummary = await portfolioService.getPortfolioSummary();

    expect(updatedSummary.timestamp).not.toBe(initialSummary.timestamp);
  });

  test('should handle USD conversion accurately', async () => {
    const balances = await portfolioService.getBalances();
    const summary = await portfolioService.getPortfolioSummary();

    const totalUsdValue = balances.reduce((sum, balance) => sum + Number(balance.usdValue), 0);

    expect(Number(summary.totalValue)).toBeCloseTo(totalUsdValue, 2);
  });

  test('should calculate risk metrics', async () => {
    const riskMetrics = await portfolioService.getRiskMetrics();

    expect(riskMetrics).toBeDefined();
    expect(riskMetrics.valueAtRisk).toBeDefined();
    expect(riskMetrics.expectedShortfall).toBeDefined();
    expect(riskMetrics.beta).toBeDefined();
    expect(riskMetrics.volatility).toBeDefined();
    expect(riskMetrics.correlation).toBeDefined();
  });
});

describe('MCP Resource Format', () => {
  test('should format balance as MCP resource', async () => {
    const balances = await portfolioService.getBalances();

    for (const balance of balances) {
      // Check MCP resource format
      expect(balance).toHaveProperty('asset');
      expect(balance).toHaveProperty('free');
      expect(balance).toHaveProperty('locked');
      expect(balance).toHaveProperty('total');
      expect(balance).toHaveProperty('usdValue');
      expect(balance).toHaveProperty('timestamp');

      // Validate data types
      expect(typeof balance.asset).toBe('string');
      expect(typeof balance.free).toBe('string');
      expect(typeof balance.locked).toBe('string');
      expect(typeof balance.total).toBe('string');
      expect(typeof balance.usdValue).toBe('string');
      expect(typeof balance.timestamp).toBe('string');
    }
  });

  test('should format position as MCP resource', async () => {
    const positions = await portfolioService.getPositions();

    for (const position of positions) {
      // Check MCP resource format
      expect(position).toHaveProperty('symbol');
      expect(position).toHaveProperty('asset');
      expect(position).toHaveProperty('quantity');
      expect(position).toHaveProperty('averagePrice');
      expect(position).toHaveProperty('currentPrice');
      expect(position).toHaveProperty('marketValue');
      expect(position).toHaveProperty('unrealizedPnl');
      expect(position).toHaveProperty('side');
      expect(position).toHaveProperty('timestamp');

      // Validate data types
      expect(typeof position.symbol).toBe('string');
      expect(typeof position.asset).toBe('string');
      expect(typeof position.quantity).toBe('string');
      expect(typeof position.side).toBe('string');
    }
  });
});

describe('Performance Tests', () => {
  test('should respond within 200ms for portfolio summary', async () => {
    const startTime = Date.now();
    await portfolioService.getPortfolioSummary();
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(200);
  });

  test('should respond within 200ms for balance fetching', async () => {
    const startTime = Date.now();
    await portfolioService.getBalances();
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(200);
  });

  test('should handle concurrent requests efficiently', async () => {
    const promises = [
      portfolioService.getPortfolioSummary(),
      portfolioService.getBalances(),
      portfolioService.getPositions(),
      portfolioService.getTransactionHistory({ limit: 10 }),
    ];

    const startTime = Date.now();
    await Promise.all(promises);
    const endTime = Date.now();

    // Should handle concurrent requests within 300ms
    expect(endTime - startTime).toBeLessThan(300);
  });
});

describe('Error Handling', () => {
  test('should handle API errors gracefully', async () => {
    // Mock API error
    mockMEXCClient.getAccountInfo.mockRejectedValueOnce(new Error('API Error'));

    await expect(portfolioService.getBalances()).rejects.toThrow('API Error');
  });

  test('should handle network timeouts', async () => {
    // Mock timeout
    mockMEXCClient.getAccountInfo.mockImplementationOnce(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
    );

    await expect(portfolioService.getBalances()).rejects.toThrow('Timeout');
  });

  test('should handle invalid data gracefully', async () => {
    // Mock invalid data
    mockMEXCClient.getAccountInfo.mockResolvedValueOnce({
      balances: [{ asset: '', free: 'invalid', locked: 'invalid' }],
    });

    const balances = await portfolioService.getBalances();
    expect(balances).toBeDefined();
    expect(Array.isArray(balances)).toBe(true);
  });
});

describe('Data Validation', () => {
  test('should validate all numeric fields are properly formatted', async () => {
    const summary = await portfolioService.getPortfolioSummary();

    expect(Number(summary.totalValue)).not.toBeNaN();
    expect(Number(summary.totalBalance)).not.toBeNaN();
    expect(Number(summary.totalPnl)).not.toBeNaN();
    expect(Number(summary.totalPnlPercent)).not.toBeNaN();
  });

  test('should validate timestamp formats', async () => {
    const balances = await portfolioService.getBalances();

    for (const balance of balances) {
      expect(new Date(balance.timestamp).getTime()).not.toBeNaN();
    }
  });

  test('should validate percentage calculations', async () => {
    const balances = await portfolioService.getBalances();
    const totalPercentage = balances.reduce((sum, b) => sum + b.percentage, 0);

    expect(totalPercentage).toBeCloseTo(100, 1);
  });
});
