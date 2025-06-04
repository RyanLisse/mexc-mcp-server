/**
 * Task #10: Portfolio Balance Service
 * Production implementation for real-time account balance tracking with USD conversion and Redis caching
 * Requirements:
 * - Create GET endpoint for account balances
 * - Fetch from MEXC REST API
 * - Convert to USD using latest rates
 * - Cache balances in Redis
 * - Example: GET /portfolio/balance
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
  getAccountInfo: () => Promise<{
    balances: Array<{
      asset: string;
      free: string;
      locked: string;
    }>;
  }>;
  getCurrentPrices: (symbols: string[]) => Promise<Record<string, string>>;
}

// Redis Cache interface
export interface RedisCache {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { ttl?: number }) => Promise<string>;
  del: (key: string) => Promise<number>;
  exists: (key: string) => Promise<boolean>;
  ttl: (key: string) => Promise<number>;
}

// Portfolio balance data structure
export interface PortfolioBalanceData {
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
    total: string;
    usdValue: string;
    percentage: number;
  }>;
  totalValue: string;
  timestamp: string;
}

// Response interface
export interface BalanceResponse {
  success: boolean;
  data?: PortfolioBalanceData;
  error?: string;
  timestamp: number;
}

// Request options interface
export interface BalanceRequestOptions {
  includeZero?: boolean;
  forceRefresh?: boolean;
}

/**
 * Task #10 Portfolio Balance Service
 * Implements real-time account balance tracking with USD conversion and Redis caching
 */
export class TaskTenPortfolioBalanceService {
  private logger: Logger;
  private mexcClient: MexcClient;
  private redisCache: RedisCache;
  private readonly CACHE_TTL = 30; // 30 seconds

  constructor(logger: Logger, mexcClient: MexcClient, redisCache: RedisCache) {
    this.logger = logger;
    this.mexcClient = mexcClient;
    this.redisCache = redisCache;
  }

  async getBalance(options: BalanceRequestOptions = {}): Promise<BalanceResponse> {
    const startTime = Date.now();
    const { includeZero = false, forceRefresh = false } = options;

    try {
      // Log balance request
      this.logger.info('Portfolio balance request', {
        includeZero,
        forceRefresh,
        timestamp: startTime,
      });

      // Generate cache key based on options
      const cacheKey = this.generateCacheKey(options);

      // Check cache first unless forced refresh
      if (!forceRefresh) {
        try {
          const cachedData = await this.getCachedData(cacheKey);
          if (cachedData) {
            this.logger.info('Portfolio balance retrieved successfully', {
              totalAssets: cachedData.balances.length,
              totalValue: cachedData.totalValue,
              cached: true,
              processingTime: Date.now() - startTime,
            });

            return {
              success: true,
              data: cachedData,
              timestamp: startTime,
            };
          }
        } catch (error) {
          this.logger.warn('Cache read failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            cacheKey,
          });
        }
      }

      // Cache miss or refresh requested - fetch fresh data
      this.logger.debug('Cache miss, fetching fresh data', { cacheKey });

      // Fetch account information from MEXC
      const accountInfo = await this.mexcClient.getAccountInfo();

      if (!accountInfo?.balances) {
        throw new Error('Invalid account info response');
      }

      // Get current prices for USD conversion
      const symbols = this.extractTradingPairs(accountInfo.balances);
      const prices = await this.mexcClient.getCurrentPrices(symbols);

      // Process balances
      const portfolioData = await this.processBalances(accountInfo.balances, prices, includeZero);

      // Cache the results
      try {
        await this.redisCache.set(cacheKey, JSON.stringify(portfolioData), { ttl: this.CACHE_TTL });
      } catch (error) {
        this.logger.warn('Cache write failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          cacheKey,
        });
      }

      // Log successful retrieval
      this.logger.info('Portfolio balance retrieved successfully', {
        totalAssets: portfolioData.balances.length,
        totalValue: portfolioData.totalValue,
        cached: false,
        processingTime: Date.now() - startTime,
      });

      return {
        success: true,
        data: portfolioData,
        timestamp: startTime,
      };
    } catch (error) {
      // Log balance retrieval errors
      this.logger.error('Failed to fetch portfolio balance', {
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
   * Process raw balance data into portfolio balances with USD conversion
   */
  private async processBalances(
    rawBalances: Array<{
      asset: string;
      free: string;
      locked: string;
    }>,
    prices: Record<string, string>,
    includeZero: boolean
  ): Promise<PortfolioBalanceData> {
    const balances: PortfolioBalanceData['balances'] = [];
    let totalUsdValue = 0;

    // First pass: calculate individual USD values and filter
    for (const balance of rawBalances) {
      const free = Number(balance.free);
      const locked = Number(balance.locked);
      const total = free + locked;

      // Skip zero balances unless requested
      if (!includeZero && total === 0) continue;

      // Skip invalid balance data
      if (!balance.asset || Number.isNaN(free) || Number.isNaN(locked)) continue;

      const usdValue = this.calculateUsdValue(balance.asset, total.toString(), prices);
      const numericUsdValue = Number(usdValue);

      balances.push({
        asset: balance.asset,
        free: balance.free,
        locked: balance.locked,
        total: (Number(balance.free) + Number(balance.locked)).toFixed(8),
        usdValue,
        percentage: 0, // Will be calculated in second pass
      });

      totalUsdValue += numericUsdValue;
    }

    // Second pass: calculate percentages
    for (const balance of balances) {
      const usdValue = Number(balance.usdValue);
      balance.percentage =
        totalUsdValue > 0 ? Number(((usdValue / totalUsdValue) * 100).toFixed(2)) : 0;
    }

    // Sort by USD value (descending)
    balances.sort((a, b) => Number(b.usdValue) - Number(a.usdValue));

    return {
      balances,
      totalValue: totalUsdValue.toFixed(2),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate USD value for an asset
   */
  private calculateUsdValue(asset: string, amount: string, prices: Record<string, string>): string {
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
    if (prices[usdtPair]) {
      const price = Number(prices[usdtPair]);
      return (quantity * price).toFixed(2);
    }

    // Look for reverse pair (for assets like BTC where we might have USDTBTC)
    const reverseUsdtPair = `USDT${asset}`;
    if (prices[reverseUsdtPair]) {
      const price = Number(prices[reverseUsdtPair]);
      return price > 0 ? (quantity / price).toFixed(2) : '0.00';
    }

    // Try with BTC as intermediate
    const btcPair = `${asset}BTC`;
    const btcUsdtPair = 'BTCUSDT';

    if (prices[btcPair] && prices[btcUsdtPair]) {
      const assetBtcPrice = Number(prices[btcPair]);
      const btcUsdtPrice = Number(prices[btcUsdtPair]);
      return (quantity * assetBtcPrice * btcUsdtPrice).toFixed(2);
    }

    // Try with ETH as intermediate
    const ethPair = `${asset}ETH`;
    const ethUsdtPair = 'ETHUSDT';

    if (prices[ethPair] && prices[ethUsdtPair]) {
      const assetEthPrice = Number(prices[ethPair]);
      const ethUsdtPrice = Number(prices[ethUsdtPair]);
      return (quantity * assetEthPrice * ethUsdtPrice).toFixed(2);
    }

    // If no conversion found, return 0
    this.logger.warn(`No USD conversion found for asset: ${asset}`);
    return '0.00';
  }

  /**
   * Extract trading pairs needed for USD conversion
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
   * Generate cache key based on request options
   */
  private generateCacheKey(options: BalanceRequestOptions): string {
    const { includeZero = false } = options;
    return includeZero ? 'portfolio:balance:includeZero' : 'portfolio:balance:default';
  }

  /**
   * Get cached data if available and valid
   */
  private async getCachedData(cacheKey: string): Promise<PortfolioBalanceData | null> {
    const exists = await this.redisCache.exists(cacheKey);
    if (!exists) {
      return null;
    }

    const cachedDataString = await this.redisCache.get(cacheKey);
    if (!cachedDataString) {
      return null;
    }

    try {
      return JSON.parse(cachedDataString) as PortfolioBalanceData;
    } catch (error) {
      this.logger.warn('Failed to parse cached data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cacheKey,
      });
      return null;
    }
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
