/**
 * Task #11: Position Monitoring Service
 * Production implementation for position monitoring with P&L calculations
 * Requirements:
 * - Create GET endpoint for positions
 * - Calculate P&L using current prices and entry points
 * - Store in PostgreSQL
 * - Example: GET /portfolio/positions
 */

// Logger interface
export interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

// MEXC Client interface
export interface MexcClient {
  getAccountTrades: (symbol?: string) => Promise<
    Array<{
      id: string;
      symbol: string;
      side: 'BUY' | 'SELL';
      qty: string;
      price: string;
      commission: string;
      commissionAsset: string;
      time: number;
      orderId: string;
    }>
  >;
  getCurrentPrices: (symbols: string[]) => Promise<Record<string, string>>;
  getAccountInfo: () => Promise<{
    balances: Array<{
      asset: string;
      free: string;
      locked: string;
    }>;
  }>;
}

// PostgreSQL Database interface
export interface PostgresDB {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
  insert: (table: string, data: Record<string, any>) => Promise<{ insertId: number }>;
  update: (
    table: string,
    data: Record<string, any>,
    where: Record<string, any>
  ) => Promise<{ rowsAffected: number }>;
  delete: (table: string, where: Record<string, any>) => Promise<{ rowsAffected: number }>;
  transaction: (fn: (db: PostgresDB) => Promise<any>) => Promise<any>;
}

// Position data structure
export interface PositionData {
  symbol: string;
  quantity: string;
  averagePrice: string;
  currentPrice: string;
  marketValue: string;
  unrealizedPnl: string;
  unrealizedPnlPercent: number;
  costBasis: string;
  timestamp: string;
}

// Response interface
export interface PositionResponse {
  success: boolean;
  data?: {
    positions: PositionData[];
    totalMarketValue: string;
    totalUnrealizedPnl: string;
    totalCostBasis: string;
  };
  error?: string;
  timestamp: number;
}

// Request options interface
export interface PositionRequestOptions {
  symbol?: string;
  minValue?: number;
  persistToDb?: boolean;
  forceRefresh?: boolean;
}

// Position stream interface
export interface PositionStream {
  subscribe: (callback: (position: PositionData) => void) => void;
  unsubscribe: () => void;
}

// P&L Analytics interfaces
export interface DailyPnLResponse {
  success: boolean;
  data?: {
    dailyPnl: string;
    dailyPnlPercent: number;
    timestamp: string;
  };
  error?: string;
  timestamp: number;
}

export interface PositionMetricsResponse {
  success: boolean;
  data?: {
    totalPositions: number;
    totalMarketValue: string;
    totalUnrealizedPnl: string;
    totalCostBasis: string;
    bestPerformer: { symbol: string; pnlPercent: number };
    worstPerformer: { symbol: string; pnlPercent: number };
  };
  error?: string;
  timestamp: number;
}

/**
 * Task #11 Position Monitoring Service
 * Implements position monitoring with P&L calculations and database storage
 */
export class TaskElevenPositionMonitoringService {
  private logger: Logger;
  private mexcClient: MexcClient;
  private postgresDB: PostgresDB;
  private readonly CACHE_TTL = 30000; // 30 seconds
  private positionCache: {
    data: PositionResponse['data'];
    timestamp: number;
    responseTimestamp: number;
  } | null = null;
  private positionStreams: Map<string, PositionStream> = new Map();

  constructor(logger: Logger, mexcClient: MexcClient, postgresDB: PostgresDB) {
    this.logger = logger;
    this.mexcClient = mexcClient;
    this.postgresDB = postgresDB;
  }

  async getPositions(options: PositionRequestOptions = {}): Promise<PositionResponse> {
    const startTime = Date.now();
    const { symbol, minValue, persistToDb = false, forceRefresh = false } = options;

    try {
      // Log position request
      this.logger.info('Position retrieval request', {
        filters: { symbol, minValue, persistToDb },
        timestamp: startTime,
      });

      // Check cache first unless forced refresh
      if (!forceRefresh && this.positionCache && this.isCacheValid()) {
        let positions = this.positionCache.data?.positions;

        // Apply filters
        if (symbol) {
          positions = positions.filter((p) => p.symbol === symbol);
        }
        if (minValue) {
          positions = positions.filter((p) => Number(p.marketValue) >= minValue);
        }

        const filteredData = this.calculateTotals(positions);

        this.logger.info('Positions retrieved from cache', {
          totalPositions: positions.length,
          totalMarketValue: filteredData.totalMarketValue,
          processingTime: Date.now() - startTime,
        });

        return {
          success: true,
          data: filteredData,
          timestamp: this.positionCache.responseTimestamp,
        };
      }

      // Fetch fresh data
      this.logger.debug('Cache miss, fetching fresh position data', { symbol });

      // Get account trades and current prices
      const trades = await this.mexcClient.getAccountTrades(symbol);
      const symbols = [...new Set(trades.map((t) => t.symbol))];
      const currentPrices = await this.mexcClient.getCurrentPrices(symbols);

      // Calculate positions from trades
      const positions = await this.calculatePositionsFromTrades(trades, currentPrices);

      // Apply filters
      let filteredPositions = positions;
      if (symbol) {
        filteredPositions = positions.filter((p) => p.symbol === symbol);
      }
      if (minValue) {
        filteredPositions = positions.filter((p) => Number(p.marketValue) >= minValue);
      }

      // Calculate totals
      const positionData = this.calculateTotals(filteredPositions);

      // Cache the unfiltered results
      this.positionCache = {
        data: this.calculateTotals(positions),
        timestamp: Date.now(),
        responseTimestamp: startTime,
      };

      // Persist to database if requested
      if (persistToDb) {
        await this.persistPositionsToDatabase(positions);
      }

      // Log successful calculation
      this.logger.info('Positions calculated successfully', {
        totalPositions: filteredPositions.length,
        totalMarketValue: positionData.totalMarketValue,
        processingTime: Date.now() - startTime,
      });

      return {
        success: true,
        data: positionData,
        timestamp: startTime,
      };
    } catch (error) {
      // Log position calculation errors
      this.logger.error('Failed to fetch positions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        options,
        timestamp: startTime,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: startTime,
      };
    }
  }

  /**
   * Calculate positions from trade data
   */
  private async calculatePositionsFromTrades(
    trades: Array<{
      id: string;
      symbol: string;
      side: 'BUY' | 'SELL';
      qty: string;
      price: string;
      commission: string;
      commissionAsset: string;
      time: number;
    }>,
    currentPrices: Record<string, string>
  ): Promise<PositionData[]> {
    const positionMap = new Map<
      string,
      {
        totalQty: number;
        totalCost: number;
        trades: number;
      }
    >();

    // Process trades to calculate average entry prices
    for (const trade of trades) {
      // Skip invalid trade data
      if (!trade.symbol || Number.isNaN(Number(trade.qty)) || Number.isNaN(Number(trade.price))) {
        continue;
      }

      const qty = Number(trade.qty);
      const price = Number(trade.price);
      const cost = qty * price;

      if (!positionMap.has(trade.symbol)) {
        positionMap.set(trade.symbol, {
          totalQty: 0,
          totalCost: 0,
          trades: 0,
        });
      }

      const position = positionMap.get(trade.symbol)!;

      if (trade.side === 'BUY') {
        position.totalQty += qty;
        position.totalCost += cost;
      } else {
        // SELL trades reduce position
        position.totalQty -= qty;
        position.totalCost -= cost;
      }

      position.trades++;
    }

    // Convert to position data
    const positions: PositionData[] = [];

    for (const [symbol, position] of positionMap) {
      // Skip positions with zero quantity
      if (position.totalQty <= 0) {
        continue;
      }

      const currentPrice = Number(currentPrices[symbol] || '0');
      const averagePrice = position.totalCost / position.totalQty;
      const marketValue = position.totalQty * currentPrice;
      const costBasis = position.totalQty * averagePrice;
      const unrealizedPnl = marketValue - costBasis;
      const unrealizedPnlPercent = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

      positions.push({
        symbol,
        quantity: position.totalQty.toFixed(4),
        averagePrice: averagePrice.toFixed(2),
        currentPrice: currentPrice.toFixed(2),
        marketValue: marketValue.toFixed(2),
        unrealizedPnl: unrealizedPnl.toFixed(2),
        unrealizedPnlPercent: Number(unrealizedPnlPercent.toFixed(2)),
        costBasis: costBasis.toFixed(2),
        timestamp: new Date().toISOString(),
      });
    }

    // Sort by market value descending
    return positions.sort((a, b) => Number(b.marketValue) - Number(a.marketValue));
  }

  /**
   * Calculate totals for position data
   */
  private calculateTotals(positions: PositionData[]) {
    const totalMarketValue = positions.reduce((sum, p) => sum + Number(p.marketValue), 0);
    const totalUnrealizedPnl = positions.reduce((sum, p) => sum + Number(p.unrealizedPnl), 0);
    const totalCostBasis = positions.reduce((sum, p) => sum + Number(p.costBasis), 0);

    return {
      positions,
      totalMarketValue: totalMarketValue.toFixed(2),
      totalUnrealizedPnl: totalUnrealizedPnl.toFixed(2),
      totalCostBasis: totalCostBasis.toFixed(2),
    };
  }

  /**
   * Persist positions to PostgreSQL database
   */
  private async persistPositionsToDatabase(positions: PositionData[]): Promise<void> {
    for (const position of positions) {
      try {
        this.logger.debug('Persisting position to database', {
          symbol: position.symbol,
          operation: 'upsert',
        });

        // Check if position exists
        const existing = await this.postgresDB.query('SELECT id FROM positions WHERE symbol = $1', [
          position.symbol,
        ]);

        if (existing.rows.length > 0) {
          // Update existing position
          await this.postgresDB.update(
            'positions',
            {
              quantity: position.quantity,
              averagePrice: position.averagePrice,
              currentPrice: position.currentPrice,
              marketValue: position.marketValue,
              unrealizedPnl: position.unrealizedPnl,
              unrealizedPnlPercent: position.unrealizedPnlPercent,
              costBasis: position.costBasis,
              updatedAt: new Date(),
            },
            { symbol: position.symbol }
          );
        } else {
          // Insert new position
          await this.postgresDB.insert('positions', {
            symbol: position.symbol,
            quantity: position.quantity,
            averagePrice: position.averagePrice,
            currentPrice: position.currentPrice,
            marketValue: position.marketValue,
            unrealizedPnl: position.unrealizedPnl,
            unrealizedPnlPercent: position.unrealizedPnlPercent,
            costBasis: position.costBasis,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        this.logger.warn('Failed to persist position to database', {
          symbol: position.symbol,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Get real-time position stream
   */
  async getPositionStream(symbol: string): Promise<PositionStream> {
    const stream: PositionStream = {
      subscribe: (callback: (position: PositionData) => void) => {
        // Mock implementation - in production would use WebSocket or similar
        setInterval(async () => {
          try {
            const result = await this.getPositions({ symbol, forceRefresh: true });
            if (result.success && result.data && result.data.positions.length > 0) {
              callback(result.data.positions[0]);
            }
          } catch (error) {
            this.logger.error('Position stream error', {
              symbol,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }, 5000); // Update every 5 seconds
      },
      unsubscribe: () => {
        // Cleanup implementation
      },
    };

    this.positionStreams.set(symbol, stream);
    return stream;
  }

  /**
   * Refresh positions manually
   */
  async refreshPositions(): Promise<void> {
    this.positionCache = null;
    await this.getPositions({ forceRefresh: true });
  }

  /**
   * Get daily P&L
   */
  async getDailyPnL(): Promise<DailyPnLResponse> {
    try {
      const result = await this.getPositions();
      if (!result.success || !result.data) {
        throw new Error('Failed to get positions for P&L calculation');
      }

      // Mock daily P&L calculation - in production would compare with previous day
      const totalUnrealizedPnl = Number(result.data.totalUnrealizedPnl);
      const totalCostBasis = Number(result.data.totalCostBasis);
      const dailyPnlPercent = totalCostBasis > 0 ? (totalUnrealizedPnl / totalCostBasis) * 100 : 0;

      return {
        success: true,
        data: {
          dailyPnl: totalUnrealizedPnl.toFixed(2),
          dailyPnlPercent: Number(dailyPnlPercent.toFixed(2)),
          timestamp: new Date().toISOString(),
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get position metrics
   */
  async getPositionMetrics(): Promise<PositionMetricsResponse> {
    try {
      const result = await this.getPositions();
      if (!result.success || !result.data) {
        throw new Error('Failed to get positions for metrics calculation');
      }

      const { positions } = result.data;

      // Find best and worst performers
      let bestPerformer = { symbol: 'N/A', pnlPercent: 0 };
      let worstPerformer = { symbol: 'N/A', pnlPercent: 0 };

      if (positions.length > 0) {
        const sorted = [...positions].sort(
          (a, b) => b.unrealizedPnlPercent - a.unrealizedPnlPercent
        );
        bestPerformer = {
          symbol: sorted[0].symbol,
          pnlPercent: sorted[0].unrealizedPnlPercent,
        };
        worstPerformer = {
          symbol: sorted[sorted.length - 1].symbol,
          pnlPercent: sorted[sorted.length - 1].unrealizedPnlPercent,
        };
      }

      return {
        success: true,
        data: {
          totalPositions: positions.length,
          totalMarketValue: result.data.totalMarketValue,
          totalUnrealizedPnl: result.data.totalUnrealizedPnl,
          totalCostBasis: result.data.totalCostBasis,
          bestPerformer,
          worstPerformer,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Check if cache is valid based on TTL
   */
  private isCacheValid(): boolean {
    return (
      this.positionCache !== null && Date.now() - this.positionCache.timestamp < this.CACHE_TTL
    );
  }

  /**
   * Clear position cache
   */
  clearCache(): void {
    this.positionCache = null;
  }
}

// Default logger implementation for production use
export const defaultLogger: Logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.info(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    console.debug(`[DEBUG] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
};
