import { mexcClient } from '../market-data/mexc-client';
import type {
  CacheConfig,
  MarketData,
  PortfolioDataRefreshOptions,
  PortfolioPosition,
  PositionCacheEntry,
  PositionFilter,
  PositionMetrics,
} from './types';
import { PositionError, PriceError } from './types';
// import { PortfolioPositionSchema } from './types'; // Disabled for Encore compatibility

export class PositionManager {
  private positionCache: Map<string, PositionCacheEntry> = new Map();
  private priceCache: Map<string, { price: string; timestamp: number }> = new Map();
  private tradeCache: Map<string, any[]> = new Map();
  private lastUpdateTime = 0;
  private isUpdating = false;

  private readonly config: CacheConfig = {
    balanceTtl: 30000, // 30 seconds
    positionTtl: 60000, // 1 minute
    priceTtl: 5000, // 5 seconds
    maxCacheSize: 1000,
  };

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Get all portfolio positions with P&L calculations
   */
  async getPositions(options?: PortfolioDataRefreshOptions): Promise<PortfolioPosition[]> {
    try {
      const cacheKey = 'positions';

      // Check cache first unless forced refresh
      if (!options?.forceRefresh && !options?.skipCache) {
        const cached = this.positionCache.get(cacheKey);
        if (cached && this.isCacheValid(cached.timestamp, this.config.positionTtl)) {
          return cached.positions;
        }
      }

      // Prevent concurrent updates
      if (this.isUpdating) {
        await this.waitForUpdate();
        const cached = this.positionCache.get(cacheKey);
        if (cached) {
          return cached.positions;
        }
      }

      this.isUpdating = true;

      try {
        // Get account trades to calculate positions
        const trades = await this.getAllTrades();

        // Calculate positions from trades
        const positionMap = this.calculatePositionsFromTrades(trades);

        // Get current market prices
        const symbols = Array.from(positionMap.keys());
        const currentPrices = await this.getCurrentPrices(symbols);

        // Build final positions with current market data
        const positions = await this.buildPositions(positionMap, currentPrices);

        // Cache the results
        this.positionCache.set(cacheKey, {
          positions,
          timestamp: Date.now(),
        });

        this.lastUpdateTime = Date.now();
        return positions;
      } finally {
        this.isUpdating = false;
      }
    } catch (error) {
      this.isUpdating = false;
      if (error instanceof PositionError) {
        throw error;
      }
      throw new PositionError(
        `Failed to fetch positions: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get position for a specific symbol
   */
  async getPositionBySymbol(
    symbol: string,
    options?: PortfolioDataRefreshOptions
  ): Promise<PortfolioPosition | null> {
    try {
      const positions = await this.getPositions(options);
      return positions.find((p) => p.symbol === symbol.toUpperCase()) || null;
    } catch (error) {
      throw new PositionError(
        `Failed to get position for ${symbol}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get filtered positions based on criteria
   */
  async getFilteredPositions(
    filter: PositionFilter,
    options?: PortfolioDataRefreshOptions
  ): Promise<PortfolioPosition[]> {
    try {
      const positions = await this.getPositions(options);
      let filtered = positions;

      // Filter by specific symbols
      if (filter.symbols && filter.symbols.length > 0) {
        const upperSymbols = filter.symbols.map((s) => s.toUpperCase());
        filtered = filtered.filter((p) => upperSymbols.includes(p.symbol));
      }

      // Filter by minimum value
      if (filter.minValue && filter.minValue > 0) {
        filtered = filtered.filter((p) => Number(p.marketValue) >= filter.minValue!);
      }

      // Filter by side
      if (filter.side) {
        filtered = filtered.filter((p) => p.side === filter.side);
      }

      return filtered;
    } catch (error) {
      throw new PositionError(
        `Failed to get filtered positions: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get position metrics and statistics
   */
  async getPositionMetrics(): Promise<PositionMetrics> {
    try {
      const positions = await this.getPositions();

      const totalPositions = positions.length;
      const totalMarketValue = positions
        .reduce((sum, p) => sum + Number(p.marketValue), 0)
        .toFixed(2);

      const totalUnrealizedPnl = positions
        .reduce((sum, p) => sum + Number(p.unrealizedPnl), 0)
        .toFixed(2);

      const profitablePositions = positions.filter((p) => Number(p.unrealizedPnl) > 0).length;

      const losingPositions = positions.filter((p) => Number(p.unrealizedPnl) < 0).length;

      // Find largest position by market value
      const largestPosition = positions.reduce(
        (largest, current) => {
          return Number(current.marketValue) > Number(largest?.marketValue || 0)
            ? current
            : largest;
        },
        null as PortfolioPosition | null
      );

      const largestPositionData = largestPosition
        ? {
            symbol: largestPosition.symbol,
            value: largestPosition.marketValue,
            percentage:
              Number(totalMarketValue) > 0
                ? (Number(largestPosition.marketValue) / Number(totalMarketValue)) * 100
                : 0,
          }
        : undefined;

      return {
        totalPositions,
        totalMarketValue,
        totalUnrealizedPnl,
        profitablePositions,
        losingPositions,
        largestPosition: largestPositionData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new PositionError(
        `Failed to get position metrics: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Refresh position cache
   */
  async refreshPositions(): Promise<void> {
    try {
      this.clearCache();
      await this.getPositions({ forceRefresh: true });
    } catch (error) {
      throw new PositionError(
        `Failed to refresh positions: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get all trades for position calculation
   */
  private async getAllTrades(): Promise<any[]> {
    try {
      const cacheKey = 'all_trades';
      const cached = this.tradeCache.get(cacheKey);

      // Use cached trades if available and recent (5 minutes)
      if (cached && Date.now() - (cached[0]?.cacheTime || 0) < 300000) {
        return cached;
      }

      // Fetch trades from MEXC API
      const trades = await mexcClient.getAccountTrades();

      // Add cache timestamp
      const tradesWithCache = trades.map((trade) => ({
        ...trade,
        cacheTime: Date.now(),
      }));

      this.tradeCache.set(cacheKey, tradesWithCache);

      return trades;
    } catch (error) {
      throw new PositionError(
        `Failed to fetch account trades: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Calculate positions from trade history
   */
  private calculatePositionsFromTrades(trades: any[]): Map<
    string,
    {
      symbol: string;
      asset: string;
      totalQuantity: number;
      totalCost: number;
      weightedAveragePrice: number;
      side: 'long' | 'short';
    }
  > {
    const positionMap = new Map();

    for (const trade of trades) {
      const symbol = trade.symbol;
      const asset = this.extractBaseAsset(symbol);
      const quantity = Number(trade.qty);
      const price = Number(trade.price);
      const value = quantity * price;
      const isBuy = trade.isBuyer;

      if (!positionMap.has(symbol)) {
        positionMap.set(symbol, {
          symbol,
          asset,
          totalQuantity: 0,
          totalCost: 0,
          weightedAveragePrice: 0,
          side: 'long' as const,
        });
      }

      const position = positionMap.get(symbol);

      if (isBuy) {
        // Add to position
        position.totalCost += value;
        position.totalQuantity += quantity;
      } else {
        // Reduce position
        position.totalCost -= value;
        position.totalQuantity -= quantity;
      }

      // Recalculate weighted average price
      if (position.totalQuantity > 0) {
        position.weightedAveragePrice = Math.abs(position.totalCost / position.totalQuantity);
        position.side = position.totalQuantity > 0 ? 'long' : 'short';
      } else if (position.totalQuantity < 0) {
        position.weightedAveragePrice = Math.abs(position.totalCost / position.totalQuantity);
        position.side = 'short';
      }
    }

    // Filter out zero positions
    const filteredPositions = new Map();
    for (const [symbol, position] of positionMap) {
      if (Math.abs(position.totalQuantity) > 0.00000001) {
        // Use small threshold for floating point
        filteredPositions.set(symbol, position);
      }
    }

    return filteredPositions;
  }

  /**
   * Build final positions with current market data
   */
  private async buildPositions(
    positionMap: Map<string, any>,
    currentPrices: Map<string, string>
  ): Promise<PortfolioPosition[]> {
    const positions: PortfolioPosition[] = [];

    for (const [symbol, positionData] of positionMap) {
      try {
        const currentPrice = currentPrices.get(symbol) || '0';
        const quantity = Math.abs(positionData.totalQuantity);
        const averagePrice = positionData.weightedAveragePrice;
        const marketValue = quantity * Number(currentPrice);
        const cost = Math.abs(positionData.totalCost);

        // Calculate unrealized P&L
        let unrealizedPnl = 0;
        if (positionData.side === 'long') {
          unrealizedPnl = marketValue - cost;
        } else {
          unrealizedPnl = cost - marketValue;
        }

        const unrealizedPnlPercent = cost > 0 ? (unrealizedPnl / cost) * 100 : 0;

        const position: PortfolioPosition = {
          symbol,
          asset: positionData.asset,
          quantity: quantity.toString(),
          averagePrice: averagePrice.toFixed(8),
          currentPrice: Number(currentPrice).toFixed(8),
          marketValue: marketValue.toFixed(2),
          unrealizedPnl: unrealizedPnl.toFixed(2),
          unrealizedPnlPercent: Number(unrealizedPnlPercent.toFixed(2)),
          cost: cost.toFixed(2),
          side: positionData.side,
          timestamp: new Date().toISOString(),
        };

        // Validate position data
        try {
          // PortfolioPositionSchema.parse(position); // Disabled for Encore compatibility
          positions.push(position);
        } catch (error) {
          console.warn(`Invalid position data for ${symbol}:`, error);
          continue;
        }
      } catch (error) {
        console.warn(`Error processing position for ${symbol}:`, error);
        continue;
      }
    }

    // Sort by market value (descending)
    return positions.sort((a, b) => Number(b.marketValue) - Number(a.marketValue));
  }

  /**
   * Get current prices for symbols
   */
  private async getCurrentPrices(symbols: string[]): Promise<Map<string, string>> {
    try {
      const prices = new Map<string, string>();

      if (symbols.length === 0) {
        return prices;
      }

      // Check cache first
      const uncachedSymbols = symbols.filter((symbol) => {
        const cached = this.priceCache.get(symbol);
        if (cached && this.isCacheValid(cached.timestamp, this.config.priceTtl)) {
          prices.set(symbol, cached.price);
          return false;
        }
        return true;
      });

      // Fetch uncached prices
      if (uncachedSymbols.length > 0) {
        const freshPrices = await mexcClient.getCurrentPrices(uncachedSymbols);

        for (const [symbol, price] of Object.entries(freshPrices)) {
          prices.set(symbol, price);
          this.priceCache.set(symbol, {
            price,
            timestamp: Date.now(),
          });
        }
      }

      return prices;
    } catch (error) {
      throw new PriceError(
        `Failed to get current prices: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Extract base asset from trading symbol
   */
  private extractBaseAsset(symbol: string): string {
    // Common quote assets to remove
    const quoteAssets = ['USDT', 'BTC', 'ETH', 'BNB', 'USDC', 'BUSD'];

    for (const quote of quoteAssets) {
      if (symbol.endsWith(quote)) {
        return symbol.slice(0, -quote.length);
      }
    }

    // If no common quote asset found, assume last 3-4 characters are quote
    if (symbol.length > 6) {
      return symbol.slice(0, -4);
    } else if (symbol.length > 4) {
      return symbol.slice(0, -3);
    }

    return symbol;
  }

  /**
   * Check if cache is valid based on TTL
   */
  private isCacheValid(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp < ttl;
  }

  /**
   * Wait for ongoing update to complete
   */
  private async waitForUpdate(): Promise<void> {
    return new Promise((resolve) => {
      const checkUpdate = () => {
        if (!this.isUpdating) {
          resolve();
        } else {
          setTimeout(checkUpdate, 100);
        }
      };
      checkUpdate();
    });
  }

  /**
   * Check if cache is valid
   */
  isPositionCacheValid(): boolean {
    return (
      this.positionCache.size > 0 && Date.now() - this.lastUpdateTime < this.config.positionTtl
    );
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.positionCache.clear();
    this.priceCache.clear();
    this.tradeCache.clear();
    this.lastUpdateTime = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    positionCacheSize: number;
    priceCacheSize: number;
    tradeCacheSize: number;
    lastUpdateTime: number;
    isUpdating: boolean;
  } {
    return {
      positionCacheSize: this.positionCache.size,
      priceCacheSize: this.priceCache.size,
      tradeCacheSize: this.tradeCache.size,
      lastUpdateTime: this.lastUpdateTime,
      isUpdating: this.isUpdating,
    };
  }

  /**
   * Calculate position P&L for a specific time period
   */
  async getPositionPnLHistory(
    symbol: string,
    periodHours = 24
  ): Promise<{
    symbol: string;
    currentPnl: number;
    change24h: number;
    changePercent24h: number;
    history: Array<{ timestamp: string; pnl: number; price: string }>;
  }> {
    try {
      const position = await this.getPositionBySymbol(symbol);

      if (!position) {
        throw new PositionError(`Position not found for symbol: ${symbol}`);
      }

      // For now, return current P&L data
      // In a full implementation, this would fetch historical price data
      return {
        symbol: position.symbol,
        currentPnl: Number(position.unrealizedPnl),
        change24h: 0, // Would calculate from historical data
        changePercent24h: 0, // Would calculate from historical data
        history: [
          {
            timestamp: position.timestamp,
            pnl: Number(position.unrealizedPnl),
            price: position.currentPrice,
          },
        ],
      };
    } catch (error) {
      throw new PositionError(
        `Failed to get P&L history for ${symbol}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get position allocation by asset type
   */
  async getPositionAllocation(): Promise<{
    byAsset: Array<{ asset: string; value: string; percentage: number }>;
    bySize: { large: number; medium: number; small: number };
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    try {
      const positions = await this.getPositions();
      const totalValue = positions.reduce((sum, p) => sum + Number(p.marketValue), 0);

      // Group by asset
      const assetMap = new Map<string, number>();
      for (const position of positions) {
        const current = assetMap.get(position.asset) || 0;
        assetMap.set(position.asset, current + Number(position.marketValue));
      }

      const byAsset = Array.from(assetMap.entries())
        .map(([asset, value]) => ({
          asset,
          value: value.toFixed(2),
          percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        }))
        .sort((a, b) => Number(b.value) - Number(a.value));

      // Categorize by position size
      let large = 0,
        medium = 0,
        small = 0;
      for (const position of positions) {
        const percentage = totalValue > 0 ? (Number(position.marketValue) / totalValue) * 100 : 0;
        if (percentage > 20) large++;
        else if (percentage > 5) medium++;
        else small++;
      }

      // Simple risk assessment
      const maxPosition = Math.max(...byAsset.map((a) => a.percentage));
      const riskLevel = maxPosition > 50 ? 'high' : maxPosition > 25 ? 'medium' : 'low';

      return {
        byAsset,
        bySize: { large, medium, small },
        riskLevel,
      };
    } catch (error) {
      throw new PositionError(
        `Failed to get position allocation: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }
}
