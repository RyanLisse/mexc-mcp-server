import { mexcClient } from '../market-data/mexc-client';
import type {
  BalanceCacheEntry,
  BalanceFilter,
  BalanceUpdate,
  CacheConfig,
  PortfolioBalance,
  PortfolioDataRefreshOptions,
} from './types';
import { BalanceError, PriceError } from './types';
// import { PortfolioBalanceSchema } from './types'; // Disabled for Encore compatibility

export class BalanceManager {
  private balanceCache: Map<string, BalanceCacheEntry> = new Map();
  private priceCache: Map<string, { price: string; timestamp: number }> = new Map();
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
   * Get all account balances with USD conversion
   */
  async getBalances(
    includeZero = false,
    options?: PortfolioDataRefreshOptions
  ): Promise<PortfolioBalance[]> {
    try {
      const cacheKey = `balances_${includeZero}`;

      // Check cache first unless forced refresh
      if (!options?.forceRefresh && !options?.skipCache) {
        const cached = this.balanceCache.get(cacheKey);
        if (cached && this.isCacheValid(cached.timestamp, this.config.balanceTtl)) {
          return cached.balances;
        }
      }

      // Prevent concurrent updates
      if (this.isUpdating) {
        await this.waitForUpdate();
        const cached = this.balanceCache.get(cacheKey);
        if (cached) {
          return cached.balances;
        }
      }

      this.isUpdating = true;

      try {
        // Fetch account information from MEXC
        const accountInfo = await mexcClient.getAccountInfo();

        if (!accountInfo?.balances) {
          throw new BalanceError('Invalid account info response');
        }

        // Get current prices for USD conversion
        const symbols = this.extractTradingPairs(accountInfo.balances);
        const prices = await this.getCurrentPrices(symbols);

        // Process balances
        const balances = await this.processBalances(accountInfo.balances, prices, includeZero);

        // Cache the results
        this.balanceCache.set(cacheKey, {
          balances,
          timestamp: Date.now(),
        });

        this.lastUpdateTime = Date.now();
        return balances;
      } finally {
        this.isUpdating = false;
      }
    } catch (error) {
      this.isUpdating = false;
      if (error instanceof BalanceError) {
        throw error;
      }
      throw new BalanceError(
        `Failed to fetch balances: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get balance for a specific asset
   */
  async getAssetBalance(
    asset: string,
    options?: PortfolioDataRefreshOptions
  ): Promise<PortfolioBalance | null> {
    try {
      const balances = await this.getBalances(true, options);
      return balances.find((b) => b.asset === asset.toUpperCase()) || null;
    } catch (error) {
      throw new BalanceError(
        `Failed to get balance for ${asset}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get filtered balances based on criteria
   */
  async getFilteredBalances(
    filter: BalanceFilter,
    options?: PortfolioDataRefreshOptions
  ): Promise<PortfolioBalance[]> {
    try {
      const balances = await this.getBalances(filter.includeZero || false, options);

      let filtered = balances;

      // Filter by specific assets
      if (filter.assets && filter.assets.length > 0) {
        const upperAssets = filter.assets.map((a) => a.toUpperCase());
        filtered = filtered.filter((b) => upperAssets.includes(b.asset));
      }

      // Filter by minimum value
      if (filter.minValue && filter.minValue > 0) {
        filtered = filtered.filter((b) => Number(b.usdValue) >= filter.minValue!);
      }

      return filtered;
    } catch (error) {
      throw new BalanceError(
        `Failed to get filtered balances: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Refresh balance cache
   */
  async refreshBalances(): Promise<void> {
    try {
      this.clearCache();
      await this.getBalances(false, { forceRefresh: true });
      await this.getBalances(true, { forceRefresh: true });
    } catch (error) {
      throw new BalanceError(
        `Failed to refresh balances: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Process raw balance data into portfolio balances
   */
  private async processBalances(
    rawBalances: Array<{
      asset: string;
      free: string;
      locked: string;
    }>,
    prices: Map<string, string>,
    includeZero: boolean
  ): Promise<PortfolioBalance[]> {
    const balances: PortfolioBalance[] = [];
    let totalUsdValue = 0;

    // First pass: calculate total USD value
    for (const balance of rawBalances) {
      const total = Number(balance.free) + Number(balance.locked);
      if (!includeZero && total === 0) continue;

      const usdValue = this.calculateUsdValue(balance.asset, total.toString(), prices);
      totalUsdValue += Number(usdValue);
    }

    // Second pass: create portfolio balances with percentages
    for (const balance of rawBalances) {
      const total = Number(balance.free) + Number(balance.locked);
      if (!includeZero && total === 0) continue;

      const usdValue = this.calculateUsdValue(balance.asset, total.toString(), prices);
      const percentage = totalUsdValue > 0 ? (Number(usdValue) / totalUsdValue) * 100 : 0;

      const portfolioBalance: PortfolioBalance = {
        asset: balance.asset,
        free: balance.free,
        locked: balance.locked,
        total: total.toString(),
        usdValue,
        percentage: Number(percentage.toFixed(2)),
        timestamp: new Date().toISOString(),
      };

      // Validate the balance data
      try {
        // PortfolioBalanceSchema.parse(portfolioBalance); // Disabled for Encore compatibility
        balances.push(portfolioBalance);
      } catch (error) {
        console.warn(`Invalid balance data for ${balance.asset}:`, error);
        continue;
      }
    }

    // Sort by USD value (descending)
    return balances.sort((a, b) => Number(b.usdValue) - Number(a.usdValue));
  }

  /**
   * Calculate USD value for an asset
   */
  private calculateUsdValue(asset: string, amount: string, prices: Map<string, string>): string {
    const quantity = Number(amount);

    if (quantity === 0) {
      return '0.00';
    }

    // Direct USD stablecoins
    if (['USDT', 'USDC', 'BUSD', 'USD'].includes(asset)) {
      return quantity.toFixed(2);
    }

    // Look for direct trading pair with USDT
    const usdtPair = `${asset}USDT`;
    if (prices.has(usdtPair)) {
      const price = Number(prices.get(usdtPair));
      return (quantity * price).toFixed(2);
    }

    // Look for reverse pair (for assets like BTC where we might have USDTBTC)
    const reverseUsdtPair = `USDT${asset}`;
    if (prices.has(reverseUsdtPair)) {
      const price = Number(prices.get(reverseUsdtPair));
      return price > 0 ? (quantity / price).toFixed(2) : '0.00';
    }

    // Try with BTC as intermediate
    const btcPair = `${asset}BTC`;
    const btcUsdtPair = 'BTCUSDT';

    if (prices.has(btcPair) && prices.has(btcUsdtPair)) {
      const assetBtcPrice = Number(prices.get(btcPair));
      const btcUsdtPrice = Number(prices.get(btcUsdtPair));
      return (quantity * assetBtcPrice * btcUsdtPrice).toFixed(2);
    }

    // Try with ETH as intermediate
    const ethPair = `${asset}ETH`;
    const ethUsdtPair = 'ETHUSDT';

    if (prices.has(ethPair) && prices.has(ethUsdtPair)) {
      const assetEthPrice = Number(prices.get(ethPair));
      const ethUsdtPrice = Number(prices.get(ethUsdtPair));
      return (quantity * assetEthPrice * ethUsdtPrice).toFixed(2);
    }

    // If no conversion found, return 0
    console.warn(`No USD conversion found for asset: ${asset}`);
    return '0.00';
  }

  /**
   * Get current prices for trading pairs
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
   * Extract trading pairs from balance data
   */
  private extractTradingPairs(balances: Array<{ asset: string }>): string[] {
    const symbols = new Set<string>();

    for (const balance of balances) {
      const asset = balance.asset;

      // Skip stablecoins as they don't need conversion
      if (['USDT', 'USDC', 'BUSD', 'USD'].includes(asset)) {
        continue;
      }

      // Add common trading pairs
      symbols.add(`${asset}USDT`);
      symbols.add(`${asset}BTC`);
      symbols.add(`${asset}ETH`);
    }

    // Always include major pairs for conversion
    symbols.add('BTCUSDT');
    symbols.add('ETHUSDT');

    return Array.from(symbols);
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
  isBalanceCacheValid(): boolean {
    return this.balanceCache.size > 0 && Date.now() - this.lastUpdateTime < this.config.balanceTtl;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.balanceCache.clear();
    this.priceCache.clear();
    this.lastUpdateTime = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    balanceCacheSize: number;
    priceCacheSize: number;
    lastUpdateTime: number;
    isUpdating: boolean;
  } {
    return {
      balanceCacheSize: this.balanceCache.size,
      priceCacheSize: this.priceCache.size,
      lastUpdateTime: this.lastUpdateTime,
      isUpdating: this.isUpdating,
    };
  }

  /**
   * Compare balances and generate update events
   */
  async compareBalances(previousBalances: PortfolioBalance[]): Promise<BalanceUpdate[]> {
    try {
      const currentBalances = await this.getBalances(true);
      const updates: BalanceUpdate[] = [];

      const previousMap = new Map(previousBalances.map((b) => [b.asset, b]));

      for (const current of currentBalances) {
        const previous = previousMap.get(current.asset);

        if (!previous) {
          // New asset
          if (Number(current.total) > 0) {
            updates.push({
              asset: current.asset,
              previousBalance: '0.00',
              newBalance: current.total,
              change: current.total,
              changePercent: 100,
              timestamp: current.timestamp,
            });
          }
        } else {
          // Existing asset - check for changes
          const previousTotal = Number(previous.total);
          const currentTotal = Number(current.total);

          if (previousTotal !== currentTotal) {
            const change = currentTotal - previousTotal;
            const changePercent = previousTotal > 0 ? (change / previousTotal) * 100 : 100;

            updates.push({
              asset: current.asset,
              previousBalance: previous.total,
              newBalance: current.total,
              change: change.toString(),
              changePercent: Number(changePercent.toFixed(2)),
              timestamp: current.timestamp,
            });
          }
        }
      }

      return updates;
    } catch (error) {
      throw new BalanceError(
        `Failed to compare balances: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get balance summary statistics
   */
  async getBalanceSummary(): Promise<{
    totalAssets: number;
    totalValue: string;
    largestHolding: { asset: string; value: string; percentage: number } | null;
    topHoldings: Array<{ asset: string; value: string; percentage: number }>;
  }> {
    try {
      const balances = await this.getBalances();

      if (balances.length === 0) {
        return {
          totalAssets: 0,
          totalValue: '0.00',
          largestHolding: null,
          topHoldings: [],
        };
      }

      const totalValue = balances
        .reduce((sum, balance) => sum + Number(balance.usdValue), 0)
        .toFixed(2);

      const topHoldings = balances.slice(0, 10).map((balance) => ({
        asset: balance.asset,
        value: balance.usdValue,
        percentage: balance.percentage,
      }));

      return {
        totalAssets: balances.length,
        totalValue,
        largestHolding: topHoldings[0] || null,
        topHoldings,
      };
    } catch (error) {
      throw new BalanceError(
        `Failed to get balance summary: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }
}
