import { Service } from 'encore.dev/service';
import { mexcClient } from '../market-data/mexc-client';
import { BalanceManager } from './balance';
import { PositionManager } from './positions';
import type {
  BalanceHistory,
  GetBalanceHistoryArgs,
  GetBalancesArgs,
  GetPortfolioSummaryArgs,
  GetPositionsArgs,
  GetRiskMetricsArgs,
  GetTransactionHistoryArgs,
  PortfolioBalance,
  PortfolioDataRefreshOptions,
  PortfolioMetrics,
  PortfolioPosition,
  PortfolioSummary,
  PositionMetrics,
  RiskMetrics,
  TransactionHistoryQuery,
  TransactionHistoryResponse,
  TransactionRecord,
} from './types';
import { PortfolioError, TransactionError } from './types';

export default new Service('portfolio');

// Service instances
const balanceManager = new BalanceManager();
const positionManager = new PositionManager();

// Transaction cache for history
const transactionCache = new Map<
  string,
  {
    transactions: TransactionRecord[];
    timestamp: number;
    total: number;
  }
>();

// Portfolio cache
const portfolioCache = new Map<
  string,
  {
    data: any;
    timestamp: number;
  }
>();

const CACHE_TTL = {
  transactions: 300000, // 5 minutes
  portfolio: 60000, // 1 minute
  metrics: 300000, // 5 minutes
};

/**
 * Portfolio service implementation
 */
export const portfolioService = {
  /**
   * Get account balances
   */
  getBalances: async (args: GetBalancesArgs = {}): Promise<PortfolioBalance[]> => {
    try {
      const { includeZero = false, assets, refresh = false } = args;

      const options: PortfolioDataRefreshOptions = {
        forceRefresh: refresh,
      };

      if (assets && assets.length > 0) {
        return balanceManager.getFilteredBalances({ assets, includeZero }, options);
      }

      return balanceManager.getBalances(includeZero, options);
    } catch (error) {
      throw new PortfolioError(
        `Failed to get balances: ${error instanceof Error ? error.message : String(error)}`,
        'GET_BALANCES_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  },

  /**
   * Get portfolio positions
   */
  getPositions: async (args: GetPositionsArgs = {}): Promise<PortfolioPosition[]> => {
    try {
      const { symbols, minValue, refresh = false } = args;

      const options: PortfolioDataRefreshOptions = {
        forceRefresh: refresh,
      };

      if (symbols || minValue) {
        return positionManager.getFilteredPositions({ symbols, minValue }, options);
      }

      return positionManager.getPositions(options);
    } catch (error) {
      throw new PortfolioError(
        `Failed to get positions: ${error instanceof Error ? error.message : String(error)}`,
        'GET_POSITIONS_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  },

  /**
   * Get transaction history with filtering and pagination
   */
  getTransactionHistory: async (
    args: GetTransactionHistoryArgs = {}
  ): Promise<TransactionHistoryResponse> => {
    try {
      const {
        limit = 50,
        offset = 0,
        type,
        symbol,
        side,
        startTime,
        endTime,
        sortBy = 'timestamp',
        sortOrder = 'desc',
      } = args;

      // Create cache key based on filters
      const cacheKey = JSON.stringify({
        type,
        symbol,
        side,
        startTime,
        endTime,
        sortBy,
        sortOrder,
      });

      // Check cache first
      const cached = transactionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL.transactions) {
        const transactions = cached.transactions.slice(offset, offset + limit);

        return {
          transactions,
          total: cached.total,
          limit,
          offset,
          hasMore: offset + limit < cached.total,
          timestamp: new Date().toISOString(),
        };
      }

      // Fetch all transactions from API
      const allTransactions = await fetchAllTransactions();

      // Apply filters
      let filteredTransactions = allTransactions;

      if (type) {
        filteredTransactions = filteredTransactions.filter((t) => t.type === type);
      }

      if (symbol) {
        filteredTransactions = filteredTransactions.filter(
          (t) => t.symbol === symbol.toUpperCase()
        );
      }

      if (side) {
        filteredTransactions = filteredTransactions.filter((t) => t.side === side);
      }

      if (startTime) {
        filteredTransactions = filteredTransactions.filter(
          (t) => new Date(t.timestamp).getTime() >= startTime
        );
      }

      if (endTime) {
        filteredTransactions = filteredTransactions.filter(
          (t) => new Date(t.timestamp).getTime() <= endTime
        );
      }

      // Sort transactions
      filteredTransactions.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortBy) {
          case 'value':
            aValue = Number(a.value);
            bValue = Number(b.value);
            break;
          case 'quantity':
            aValue = Number(a.quantity);
            bValue = Number(b.quantity);
            break;
          default: // timestamp
            aValue = new Date(a.timestamp).getTime();
            bValue = new Date(b.timestamp).getTime();
        }

        if (sortOrder === 'desc') {
          return bValue - aValue;
        }
        return aValue - bValue;
      });

      // Cache filtered results
      transactionCache.set(cacheKey, {
        transactions: filteredTransactions,
        timestamp: Date.now(),
        total: filteredTransactions.length,
      });

      // Apply pagination
      const paginatedTransactions = filteredTransactions.slice(offset, offset + limit);

      return {
        transactions: paginatedTransactions,
        total: filteredTransactions.length,
        limit,
        offset,
        hasMore: offset + limit < filteredTransactions.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new TransactionError(
        `Failed to get transaction history: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  },

  /**
   * Get portfolio summary
   */
  getPortfolioSummary: async (args: GetPortfolioSummaryArgs = {}): Promise<PortfolioSummary> => {
    try {
      const { includeMetrics = true, refresh = false } = args;

      const cacheKey = `summary_${includeMetrics}`;

      // Check cache
      if (!refresh) {
        const cached = portfolioCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL.portfolio) {
          return cached.data;
        }
      }

      // Get balances and positions
      const balances = await balanceManager.getBalances(false, { forceRefresh: refresh });
      const positions = await positionManager.getPositions({ forceRefresh: refresh });

      // Calculate totals
      const totalBalance = balances.reduce((sum, balance) => sum + Number(balance.usdValue), 0);

      const totalPositionValue = positions.reduce(
        (sum, position) => sum + Number(position.marketValue),
        0
      );

      const totalValue = totalBalance + totalPositionValue;

      const totalPnl = positions.reduce((sum, position) => sum + Number(position.unrealizedPnl), 0);

      const totalPnlPercent = totalPositionValue > 0 ? (totalPnl / totalPositionValue) * 100 : 0;

      // Get top holdings
      const allHoldings = [
        ...balances.map((b) => ({ asset: b.asset, value: b.usdValue, percentage: b.percentage })),
        ...positions.map((p) => ({
          asset: p.asset,
          value: p.marketValue,
          percentage: totalValue > 0 ? (Number(p.marketValue) / totalValue) * 100 : 0,
        })),
      ];

      // Merge holdings by asset and get top 10
      const holdingMap = new Map<string, { asset: string; value: number; percentage: number }>();

      for (const holding of allHoldings) {
        const existing = holdingMap.get(holding.asset);
        if (existing) {
          existing.value += Number(holding.value);
          existing.percentage += holding.percentage;
        } else {
          holdingMap.set(holding.asset, {
            asset: holding.asset,
            value: Number(holding.value),
            percentage: holding.percentage,
          });
        }
      }

      const topHoldings = Array.from(holdingMap.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
        .map((h) => ({
          asset: h.asset,
          value: h.value.toFixed(2),
          percentage: Number(h.percentage.toFixed(2)),
        }));

      const summary: PortfolioSummary = {
        totalValue: totalValue.toFixed(2),
        totalBalance: totalBalance.toFixed(2),
        totalPositions: positions.length,
        totalPnl: totalPnl.toFixed(2),
        totalPnlPercent: Number(totalPnlPercent.toFixed(2)),
        topHoldings,
        timestamp: new Date().toISOString(),
      };

      // Cache results
      portfolioCache.set(cacheKey, {
        data: summary,
        timestamp: Date.now(),
      });

      return summary;
    } catch (error) {
      throw new PortfolioError(
        `Failed to get portfolio summary: ${error instanceof Error ? error.message : String(error)}`,
        'GET_PORTFOLIO_SUMMARY_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  },

  /**
   * Get balance history
   */
  getBalanceHistory: async (period = '1d', _limit = 24): Promise<BalanceHistory> => {
    try {
      // For now, return current value as single data point
      // In full implementation, would fetch historical data
      const summary = await portfolioService.getPortfolioSummary();

      const currentTime = new Date();
      const dataPoints = [
        {
          timestamp: currentTime.toISOString(),
          value: summary.totalValue,
          change: '0.00',
          changePercent: 0,
        },
      ];

      return {
        period: period as any,
        dataPoints,
        totalValue: summary.totalValue,
        change24h: '0.00',
        changePercent24h: 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new PortfolioError(
        `Failed to get balance history: ${error instanceof Error ? error.message : String(error)}`,
        'GET_BALANCE_HISTORY_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  },

  /**
   * Get portfolio metrics
   */
  getPortfolioMetrics: async (): Promise<PortfolioMetrics> => {
    try {
      const cacheKey = 'metrics';

      // Check cache
      const cached = portfolioCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL.metrics) {
        return cached.data;
      }

      const summary = await portfolioService.getPortfolioSummary();
      const transactions = await portfolioService.getTransactionHistory({ limit: 1000 });

      // Calculate basic metrics
      const trades = transactions.transactions.filter((t) => t.type === 'trade');
      const wins = trades.filter((t) => t.side === 'sell' && Number(t.value) > 0);
      const losses = trades.filter((t) => t.side === 'sell' && Number(t.value) < 0);

      const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
      const averageWin =
        wins.length > 0
          ? (wins.reduce((sum, t) => sum + Number(t.value), 0) / wins.length).toFixed(2)
          : '0.00';
      const averageLoss =
        losses.length > 0
          ? (losses.reduce((sum, t) => sum + Math.abs(Number(t.value)), 0) / losses.length).toFixed(
              2
            )
          : '0.00';

      const profitFactor = Number(averageLoss) > 0 ? Number(averageWin) / Number(averageLoss) : 0;

      const metrics: PortfolioMetrics = {
        totalValue: summary.totalValue,
        totalPnl: summary.totalPnl,
        totalPnlPercent: summary.totalPnlPercent,
        sharpeRatio: 0, // Would need historical data to calculate
        maxDrawdown: 0, // Would need historical data to calculate
        winRate: Number(winRate.toFixed(2)),
        averageWin,
        averageLoss,
        profitFactor: Number(profitFactor.toFixed(2)),
        totalTrades: trades.length,
        timestamp: new Date().toISOString(),
      };

      // Cache results
      portfolioCache.set(cacheKey, {
        data: metrics,
        timestamp: Date.now(),
      });

      return metrics;
    } catch (error) {
      throw new PortfolioError(
        `Failed to get portfolio metrics: ${error instanceof Error ? error.message : String(error)}`,
        'GET_PORTFOLIO_METRICS_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  },

  /**
   * Get risk metrics
   */
  getRiskMetrics: async (args: GetRiskMetricsArgs = {}): Promise<RiskMetrics> => {
    try {
      const { period = '30d' } = args;

      // Basic risk metrics implementation
      // In full implementation, would calculate VaR, beta, etc.
      return {
        valueAtRisk: 0,
        expectedShortfall: 0,
        beta: 0,
        volatility: 0,
        correlation: {},
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new PortfolioError(
        `Failed to get risk metrics: ${error instanceof Error ? error.message : String(error)}`,
        'GET_RISK_METRICS_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  },

  /**
   * Get position metrics
   */
  getPositionMetrics: async (): Promise<PositionMetrics> => {
    try {
      return positionManager.getPositionMetrics();
    } catch (error) {
      throw new PortfolioError(
        `Failed to get position metrics: ${error instanceof Error ? error.message : String(error)}`,
        'GET_POSITION_METRICS_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  },

  /**
   * Get asset balance
   */
  getAssetBalance: async (asset: string, refresh = false): Promise<PortfolioBalance | null> => {
    try {
      return balanceManager.getAssetBalance(asset, { forceRefresh: refresh });
    } catch (error) {
      throw new PortfolioError(
        `Failed to get asset balance: ${error instanceof Error ? error.message : String(error)}`,
        'GET_ASSET_BALANCE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  },

  /**
   * Get position by symbol
   */
  getPosition: async (symbol: string, refresh = false): Promise<PortfolioPosition | null> => {
    try {
      return positionManager.getPositionBySymbol(symbol, { forceRefresh: refresh });
    } catch (error) {
      throw new PortfolioError(
        `Failed to get position: ${error instanceof Error ? error.message : String(error)}`,
        'GET_POSITION_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  },

  /**
   * Refresh portfolio data
   */
  refreshPortfolio: async (
    components: string[] = ['all']
  ): Promise<{ success: boolean; refreshed: string[] }> => {
    try {
      const refreshed: string[] = [];

      if (components.includes('all') || components.includes('balances')) {
        await balanceManager.refreshBalances();
        refreshed.push('balances');
      }

      if (components.includes('all') || components.includes('positions')) {
        await positionManager.refreshPositions();
        refreshed.push('positions');
      }

      if (components.includes('all') || components.includes('prices')) {
        // Clear price caches
        balanceManager.clearCache();
        positionManager.clearCache();
        refreshed.push('prices');
      }

      // Clear portfolio cache
      portfolioCache.clear();
      transactionCache.clear();

      return { success: true, refreshed };
    } catch (error) {
      throw new PortfolioError(
        `Failed to refresh portfolio: ${error instanceof Error ? error.message : String(error)}`,
        'REFRESH_PORTFOLIO_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  },

  /**
   * Clear all caches
   */
  clearCache: (): void => {
    balanceManager.clearCache();
    positionManager.clearCache();
    portfolioCache.clear();
    transactionCache.clear();
  },

  /**
   * Get service health
   */
  getHealth: async (): Promise<{
    status: string;
    cacheStats: any;
    lastUpdate: string;
  }> => {
    return {
      status: 'healthy',
      cacheStats: {
        balance: balanceManager.getCacheStats(),
        position: positionManager.getCacheStats(),
        portfolio: portfolioCache.size,
        transaction: transactionCache.size,
      },
      lastUpdate: new Date().toISOString(),
    };
  },
};

/**
 * Fetch all transactions from MEXC API
 */
async function fetchAllTransactions(): Promise<TransactionRecord[]> {
  try {
    // Fetch account trades
    const trades = await mexcClient.getAccountTrades();

    // Convert trades to transaction records
    const transactions: TransactionRecord[] = trades.map((trade) => ({
      id: trade.id.toString(),
      type: 'trade' as const,
      symbol: trade.symbol,
      side: trade.isBuyer ? ('buy' as const) : ('sell' as const),
      quantity: trade.qty,
      price: trade.price,
      value: (Number(trade.qty) * Number(trade.price)).toFixed(2),
      fee: trade.commission,
      feeAsset: trade.commissionAsset,
      timestamp: new Date(trade.time).toISOString(),
      orderId: trade.orderId.toString(),
    }));

    return transactions.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    throw new TransactionError(
      `Failed to fetch transactions: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}
