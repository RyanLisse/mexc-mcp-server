import { api } from 'encore.dev/api';
import { z } from 'zod';
import { portfolioService } from './encore.service';
import {
  GetBalanceHistoryArgsSchema,
  GetBalancesArgsSchema,
  GetPortfolioSummaryArgsSchema,
  GetPositionsArgsSchema,
  GetRiskMetricsArgsSchema,
  GetTransactionHistoryArgsSchema,
} from './schemas';
import type {
  BalanceHistory,
  GetBalanceHistoryArgs,
  GetBalancesArgs,
  GetPortfolioSummaryArgs,
  GetPositionsArgs,
  GetRiskMetricsArgs,
  GetTransactionHistoryArgs,
  PortfolioBalance,
  PortfolioMetrics,
  PortfolioPosition,
  PortfolioSummary,
  PositionMetrics,
  RiskMetrics,
  TransactionHistoryResponse,
} from './types';

// Get account balances
export const getBalances = api(
  {
    method: 'POST',
    path: '/portfolio/balances',
    expose: true,
  },
  async (request: GetBalancesArgs): Promise<{ balances: PortfolioBalance[] }> => {
    // Validate request
    const validatedArgs = GetBalancesArgsSchema.parse(request);

    const balances = await portfolioService.getBalances(validatedArgs);

    return { balances };
  }
);

// Get portfolio positions
export const getPositions = api(
  {
    method: 'POST',
    path: '/portfolio/positions',
    expose: true,
  },
  async (request: GetPositionsArgs): Promise<{ positions: PortfolioPosition[] }> => {
    // Validate request
    const validatedArgs = GetPositionsArgsSchema.parse(request);

    const positions = await portfolioService.getPositions(validatedArgs);

    return { positions };
  }
);

// Get transaction history
export const getTransactionHistory = api(
  {
    method: 'POST',
    path: '/portfolio/transactions',
    expose: true,
  },
  async (request: GetTransactionHistoryArgs): Promise<TransactionHistoryResponse> => {
    // Validate request
    const validatedArgs = GetTransactionHistoryArgsSchema.parse(request);

    return portfolioService.getTransactionHistory(validatedArgs);
  }
);

// Get portfolio summary
export const getPortfolioSummary = api(
  {
    method: 'POST',
    path: '/portfolio/summary',
    expose: true,
  },
  async (request: GetPortfolioSummaryArgs): Promise<PortfolioSummary> => {
    // Validate request
    const validatedArgs = GetPortfolioSummaryArgsSchema.parse(request);

    return portfolioService.getPortfolioSummary(validatedArgs);
  }
);

// Get balance history
export const getBalanceHistory = api(
  {
    method: 'POST',
    path: '/portfolio/balance-history',
    expose: true,
  },
  async (request: GetBalanceHistoryArgs): Promise<BalanceHistory> => {
    // Validate request
    const validatedArgs = GetBalanceHistoryArgsSchema.parse(request);

    return portfolioService.getBalanceHistory(validatedArgs.period, validatedArgs.limit);
  }
);

// Get portfolio metrics
export const getPortfolioMetrics = api(
  {
    method: 'GET',
    path: '/portfolio/metrics',
    expose: true,
  },
  async (): Promise<PortfolioMetrics> => {
    return portfolioService.getPortfolioMetrics();
  }
);

// Get risk metrics
export const getRiskMetrics = api(
  {
    method: 'POST',
    path: '/portfolio/risk-metrics',
    expose: true,
  },
  async (request: GetRiskMetricsArgs): Promise<RiskMetrics> => {
    // Validate request
    const validatedArgs = GetRiskMetricsArgsSchema.parse(request);

    return portfolioService.getRiskMetrics(validatedArgs);
  }
);

// Get position metrics
export const getPositionMetrics = api(
  {
    method: 'GET',
    path: '/portfolio/position-metrics',
    expose: true,
  },
  async (): Promise<PositionMetrics> => {
    return portfolioService.getPositionMetrics();
  }
);

// Get asset balance
export const getAssetBalance = api(
  {
    method: 'GET',
    path: '/portfolio/balance/:asset',
    expose: true,
  },
  async ({ asset }: { asset: string }): Promise<{ balance: PortfolioBalance | null }> => {
    const balance = await portfolioService.getAssetBalance(asset);
    return { balance };
  }
);

// Get position by symbol
export const getPosition = api(
  {
    method: 'GET',
    path: '/portfolio/position/:symbol',
    expose: true,
  },
  async ({ symbol }: { symbol: string }): Promise<{ position: PortfolioPosition | null }> => {
    const position = await portfolioService.getPosition(symbol);
    return { position };
  }
);

// Refresh portfolio data
export const refreshPortfolio = api(
  {
    method: 'POST',
    path: '/portfolio/refresh',
    expose: true,
  },
  async (request: { components?: string[] }): Promise<{
    success: boolean;
    refreshed: string[];
  }> => {
    const { components = ['all'] } = request;

    // Validate components
    const validComponents = ['all', 'balances', 'positions', 'prices'];
    const invalidComponents = components.filter((c) => !validComponents.includes(c));

    if (invalidComponents.length > 0) {
      throw new Error(`Invalid components: ${invalidComponents.join(', ')}`);
    }

    return portfolioService.refreshPortfolio(components);
  }
);

// Get portfolio health
export const getPortfolioHealth = api(
  {
    method: 'GET',
    path: '/portfolio/health',
    expose: true,
  },
  async () => {
    const health = await portfolioService.getHealth();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      ...health,
    };
  }
);

// Get portfolio overview (simplified endpoint)
export const getOverview = api(
  {
    method: 'GET',
    path: '/portfolio/overview',
    expose: true,
  },
  async (): Promise<{
    summary: PortfolioSummary;
    topBalances: PortfolioBalance[];
    topPositions: PortfolioPosition[];
    metrics: PortfolioMetrics;
  }> => {
    // Get all data in parallel
    const [summary, allBalances, allPositions, metrics] = await Promise.all([
      portfolioService.getPortfolioSummary(),
      portfolioService.getBalances({ includeZero: false }),
      portfolioService.getPositions(),
      portfolioService.getPortfolioMetrics(),
    ]);

    // Get top 5 balances and positions
    const topBalances = allBalances.slice(0, 5);
    const topPositions = allPositions.slice(0, 5);

    return {
      summary,
      topBalances,
      topPositions,
      metrics,
    };
  }
);

// Batch endpoint for multiple operations
export const batchOperation = api(
  {
    method: 'POST',
    path: '/portfolio/batch',
    expose: true,
  },
  async (request: {
    operations: Array<{
      type: 'balances' | 'positions' | 'summary' | 'metrics' | 'transactions';
      params?: Record<string, unknown>;
    }>;
  }): Promise<{
    results: Array<{
      type: string;
      success: boolean;
      data?: any;
      error?: string;
    }>;
  }> => {
    const { operations } = request;

    if (!operations || !Array.isArray(operations)) {
      throw new Error('Operations array is required');
    }

    const results = await Promise.allSettled(
      operations.map(async (op) => {
        try {
          let data: any;

          switch (op.type) {
            case 'balances':
              data = await portfolioService.getBalances(op.params as GetBalancesArgs);
              break;
            case 'positions':
              data = await portfolioService.getPositions(op.params as GetPositionsArgs);
              break;
            case 'summary':
              data = await portfolioService.getPortfolioSummary(
                op.params as GetPortfolioSummaryArgs
              );
              break;
            case 'metrics':
              data = await portfolioService.getPortfolioMetrics();
              break;
            case 'transactions':
              data = await portfolioService.getTransactionHistory(
                op.params as GetTransactionHistoryArgs
              );
              break;
            default:
              throw new Error(`Unknown operation type: ${op.type}`);
          }

          return {
            type: op.type,
            success: true,
            data,
          };
        } catch (error) {
          return {
            type: op.type,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );

    return {
      results: results.map((result) =>
        result.status === 'fulfilled'
          ? result.value
          : {
              type: 'unknown',
              success: false,
              error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            }
      ),
    };
  }
);

// WebSocket-style real-time updates endpoint (polling-based)
export const getRealtimeUpdates = api(
  {
    method: 'GET',
    path: '/portfolio/realtime',
    expose: true,
  },
  async (query: { lastUpdate?: string }): Promise<{
    hasUpdates: boolean;
    timestamp: string;
    updates?: {
      balances?: PortfolioBalance[];
      positions?: PortfolioPosition[];
      summary?: PortfolioSummary;
    };
  }> => {
    const { lastUpdate } = query;
    const currentTime = new Date().toISOString();

    // Simple implementation - in production, would track actual changes
    let hasUpdates = true;

    if (lastUpdate) {
      const lastUpdateTime = new Date(lastUpdate).getTime();
      const currentUpdateTime = new Date().getTime();

      // Check if enough time has passed (e.g., 30 seconds)
      hasUpdates = currentUpdateTime - lastUpdateTime > 30000;
    }

    if (!hasUpdates) {
      return {
        hasUpdates: false,
        timestamp: currentTime,
      };
    }

    // Get latest data
    const [balances, positions, summary] = await Promise.all([
      portfolioService.getBalances({ includeZero: false }),
      portfolioService.getPositions(),
      portfolioService.getPortfolioSummary(),
    ]);

    return {
      hasUpdates: true,
      timestamp: currentTime,
      updates: {
        balances,
        positions,
        summary,
      },
    };
  }
);

// Portfolio analytics endpoint
export const getAnalytics = api(
  {
    method: 'POST',
    path: '/portfolio/analytics',
    expose: true,
  },
  async (request: {
    timeframe?: '24h' | '7d' | '30d' | '90d';
    includeProjections?: boolean;
  }): Promise<{
    performance: {
      totalReturn: number;
      totalReturnPercent: number;
      bestPerformer: { asset: string; return: number };
      worstPerformer: { asset: string; return: number };
    };
    allocation: {
      byAsset: Array<{ asset: string; percentage: number; value: string }>;
      diversificationScore: number;
      riskLevel: 'low' | 'medium' | 'high';
    };
    projections?: {
      nextMonth: { low: number; mid: number; high: number };
      confidence: number;
    };
  }> => {
    const { timeframe = '30d', includeProjections = false } = request;

    // Get current data
    const [positions, metrics] = await Promise.all([
      portfolioService.getPositions(),
      portfolioService.getPortfolioMetrics(),
    ]);

    // Calculate performance metrics
    const totalPnl = Number(metrics.totalPnl);
    const totalValue = Number(metrics.totalValue);
    const totalReturnPercent = metrics.totalPnlPercent;

    // Find best and worst performers
    const sortedPositions = positions
      .filter((p) => Number(p.unrealizedPnl) !== 0)
      .sort((a, b) => Number(b.unrealizedPnlPercent) - Number(a.unrealizedPnlPercent));

    const bestPerformer = sortedPositions[0]
      ? {
          asset: sortedPositions[0].asset,
          return: sortedPositions[0].unrealizedPnlPercent,
        }
      : { asset: 'N/A', return: 0 };

    const worstPerformer = sortedPositions[sortedPositions.length - 1]
      ? {
          asset: sortedPositions[sortedPositions.length - 1].asset,
          return: sortedPositions[sortedPositions.length - 1].unrealizedPnlPercent,
        }
      : { asset: 'N/A', return: 0 };

    // Calculate allocation
    const totalPositionValue = positions.reduce((sum, p) => sum + Number(p.marketValue), 0);
    const byAsset = positions.map((p) => ({
      asset: p.asset,
      percentage: totalPositionValue > 0 ? (Number(p.marketValue) / totalPositionValue) * 100 : 0,
      value: p.marketValue,
    }));

    // Simple diversification score (based on number of assets and distribution)
    const diversificationScore = Math.min(100, positions.length * 10);

    // Risk level based on concentration
    const maxAllocation = Math.max(...byAsset.map((a) => a.percentage), 0);
    const riskLevel = maxAllocation > 50 ? 'high' : maxAllocation > 25 ? 'medium' : 'low';

    const result: any = {
      performance: {
        totalReturn: totalPnl,
        totalReturnPercent,
        bestPerformer,
        worstPerformer,
      },
      allocation: {
        byAsset,
        diversificationScore,
        riskLevel,
      },
    };

    // Add projections if requested
    if (includeProjections) {
      result.projections = {
        nextMonth: {
          low: totalValue * 0.95,
          mid: totalValue * 1.02,
          high: totalValue * 1.1,
        },
        confidence: 0.68, // 68% confidence interval
      };
    }

    return result;
  }
);
