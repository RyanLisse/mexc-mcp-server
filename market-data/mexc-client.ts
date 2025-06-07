import type { OrderBookData, Stats24hData, TickerData } from './tools.js';

import { retryWithBackoff } from '../shared/utils/index.js';
import { marketDataConfig } from './config.js';

// MEXC API response types
interface MEXCApiResponse {
  code?: number;
  msg?: string;
}

interface MEXCTickerResponse extends MEXCApiResponse {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  count: number | null;
}

interface MEXCOrderBookResponse extends MEXCApiResponse {
  bids: string[][];
  asks: string[][];
}

interface MEXCExchangeInfo extends MEXCApiResponse {
  symbols: Array<{
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    filters: Array<{
      filterType: string;
      minPrice?: string;
      maxPrice?: string;
      tickSize?: string;
      minQty?: string;
      maxQty?: string;
      stepSize?: string;
      minNotional?: string;
    }>;
  }>;
}

interface MEXCTimeResponse extends MEXCApiResponse {
  serverTime: number;
}

// Trading-related interfaces for placeholder implementations
interface MEXCPlaceOrderResponse extends MEXCApiResponse {
  orderId: string;
  symbol: string;
  status: string;
  executedQty: string;
  price?: string; // Add price field
  fills?: Array<{
    price: string;
    qty: string;
    commission: string;
    commissionAsset: string;
  }>;
}

interface MEXCCancelOrderResponse extends MEXCApiResponse {
  orderId: string;
  origClientOrderId?: string; // Add origClientOrderId field
  symbol: string;
  status: string;
  origQty: string;
  executedQty: string;
}

interface MEXCOrderResponse extends MEXCApiResponse {
  orderId: string;
  clientOrderId?: string; // Add clientOrderId field
  symbol: string;
  side: string;
  type: string;
  status: string;
  origQty: string;
  executedQty: string;
  price: string;
  avgPrice?: string; // Add avgPrice field
  stopPrice?: string;
  timeInForce?: string; // Add timeInForce field
  commission?: string; // Add commission field
  commissionAsset?: string; // Add commissionAsset field
  time: number;
  updateTime: number;
}

// Add new interfaces for pattern sniper
interface MEXCCalendarEntry {
  vcoinId: string;
  symbol: string;
  projectName: string;
  firstOpenTime: number;
}

interface MEXCCalendarResponse extends MEXCApiResponse {
  data: MEXCCalendarEntry[];
}

interface MEXCSymbolV2Entry {
  cd: string; // vcoinId
  ca?: string; // contract address
  ps?: number; // price scale
  qs?: number; // quantity scale
  sts: number; // symbol trading status
  st: number; // state
  tt: number; // trading type
  ot?: number; // open time
}

interface MEXCSymbolsV2Response extends MEXCApiResponse {
  data: {
    symbols: MEXCSymbolV2Entry[];
  };
}

/**
 * MEXC API Client for interacting with the MEXC exchange
 */
export class MEXCApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly secretKey: string;

  constructor() {
    this.baseUrl = marketDataConfig.mexc.baseUrl;
    this.apiKey = marketDataConfig.mexc.apiKey;
    this.secretKey = marketDataConfig.mexc.secretKey;
  }

  /**
   * Generate HMAC signature for authenticated requests
   */
  private generateSignature(queryString: string): string {
    const crypto = require('node:crypto');
    return crypto.createHmac('sha256', this.secretKey).update(queryString).digest('hex');
  }

  /**
   * Create query string from parameters
   */
  private createQueryString(params: Record<string, string | number>): string {
    return Object.keys(params)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
  }

  /**
   * Make HTTP request to MEXC API
   */
  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, string | number> = {},
    requireAuth = false
  ): Promise<T> {
    try {
      let url = `${this.baseUrl}${endpoint}`;
      let queryString = '';

      if (Object.keys(params).length > 0) {
        queryString = this.createQueryString(params);
        url += `?${queryString}`;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-MEXC-APIKEY': this.apiKey,
      };

      // Add signature for authenticated requests
      if (requireAuth) {
        const timestamp = Date.now();
        const signatureParams = { ...params, timestamp };
        const signatureQuery = this.createQueryString(signatureParams);
        const signature = this.generateSignature(signatureQuery);

        url += `${queryString ? '&' : '?'}timestamp=${timestamp}&signature=${signature}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MEXC API error ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as MEXCApiResponse;

      // Handle MEXC API error responses
      if (data.code && data.code !== 200) {
        throw new Error(`MEXC API error: ${data.msg ?? 'Unknown error'}`);
      }

      return data as T;
    } catch (error) {
      throw new Error(
        `Failed to call MEXC API: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get ticker data for a symbol
   */
  async getTicker(symbol: string): Promise<TickerData> {
    try {
      const response = await retryWithBackoff(() =>
        this.makeRequest<MEXCTickerResponse>('/api/v3/ticker/24hr', { symbol })
      );

      // Transform MEXC response to our format
      return {
        symbol: response.symbol,
        price: response.lastPrice,
        priceChange: response.priceChange,
        priceChangePercent: response.priceChangePercent,
        volume: response.volume,
        quoteVolume: response.quoteVolume,
        open: response.openPrice,
        high: response.highPrice,
        low: response.lowPrice,
        count: response.count ?? 0,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(
        `Failed to get ticker for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get order book data for a symbol
   */
  async getOrderBook(symbol: string, limit: number): Promise<OrderBookData> {
    try {
      const response = await retryWithBackoff(() =>
        this.makeRequest<MEXCOrderBookResponse>('/api/v3/depth', { symbol, limit })
      );

      // Transform MEXC response to our format
      return {
        symbol,
        bids: response.bids.map((bid: string[]) => ({ price: bid[0], quantity: bid[1] })),
        asks: response.asks.map((ask: string[]) => ({ price: ask[0], quantity: ask[1] })),
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(
        `Failed to get order book for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get 24h statistics for symbols
   */
  async get24hStats(symbol?: string): Promise<Stats24hData[]> {
    try {
      const params: Record<string, string> = symbol ? { symbol } : {};
      const response = await retryWithBackoff(() =>
        this.makeRequest<MEXCTickerResponse | MEXCTickerResponse[]>('/api/v3/ticker/24hr', params)
      );

      // Handle both single symbol and multiple symbols responses
      const data = Array.isArray(response) ? response : [response];

      return data.map((item: MEXCTickerResponse) => ({
        symbol: item.symbol,
        volume: item.volume,
        volumeQuote: item.quoteVolume,
        priceChange: item.priceChange,
        priceChangePercent: item.priceChangePercent,
        high: item.highPrice,
        low: item.lowPrice,
        trades: item.count ?? 0,
        timestamp: Date.now(),
      }));
    } catch (error) {
      throw new Error(
        `Failed to get 24h stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get account information (requires authentication)
   */
  async getAccountInfo(): Promise<Record<string, unknown>> {
    try {
      return await retryWithBackoff(() =>
        this.makeRequest<Record<string, unknown>>('/api/v3/account', {}, true)
      );
    } catch (error) {
      throw new Error(
        `Failed to get account info: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Test connectivity and authentication
   */
  async testConnectivity(): Promise<{ success: boolean; message: string }> {
    try {
      // Test public endpoint
      await this.makeRequest('/api/v3/ping');

      // Test server time
      const timeResponse = await this.makeRequest<MEXCTimeResponse>('/api/v3/time');
      const serverTime = timeResponse.serverTime;
      const localTime = Date.now();
      const timeDiff = Math.abs(serverTime - localTime);

      if (timeDiff > 5000) {
        return {
          success: false,
          message: `Server time difference too large: ${timeDiff}ms`,
        };
      }

      return {
        success: true,
        message: 'Connectivity test successful',
      };
    } catch (error) {
      return {
        success: false,
        message: `Connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Test authentication with account endpoint
   */
  async testAuthentication(): Promise<{ success: boolean; message: string }> {
    try {
      await this.getAccountInfo();
      return {
        success: true,
        message: 'Authentication test successful',
      };
    } catch (error) {
      return {
        success: false,
        message: `Authentication test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get exchange information
   */
  async getExchangeInfo(): Promise<MEXCExchangeInfo> {
    try {
      // For now, return placeholder data that matches the interface
      // In production, this should call the real MEXC API:
      // return await retryWithBackoff(() =>
      //   this.makeRequest<MEXCExchangeInfo>('/api/v3/exchangeInfo')
      // );

      return {
        symbols: [
          {
            symbol: 'BTCUSDT',
            status: 'TRADING',
            baseAsset: 'BTC',
            quoteAsset: 'USDT',
            filters: [
              {
                filterType: 'PRICE_FILTER',
                minPrice: '0.01',
                maxPrice: '1000000',
                tickSize: '0.01',
              },
              {
                filterType: 'LOT_SIZE',
                minQty: '0.00001',
                maxQty: '9000',
                stepSize: '0.00001',
              },
              {
                filterType: 'MIN_NOTIONAL',
                minNotional: '1',
              },
            ],
          },
          {
            symbol: 'ETHUSDT',
            status: 'TRADING',
            baseAsset: 'ETH',
            quoteAsset: 'USDT',
            filters: [
              {
                filterType: 'PRICE_FILTER',
                minPrice: '0.01',
                maxPrice: '100000',
                tickSize: '0.01',
              },
              {
                filterType: 'LOT_SIZE',
                minQty: '0.0001',
                maxQty: '9000',
                stepSize: '0.0001',
              },
              {
                filterType: 'MIN_NOTIONAL',
                minNotional: '1',
              },
            ],
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Failed to get exchange info: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all active trading symbols
   */
  async getActiveSymbols(): Promise<string[]> {
    try {
      const exchangeInfo = await this.getExchangeInfo();
      return exchangeInfo.symbols.filter((s) => s.status === 'TRADING').map((s) => s.symbol);
    } catch (error) {
      throw new Error(
        `Failed to get active symbols: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get account trades (requires authentication)
   */
  async getAccountTrades(
    symbol?: string,
    limit = 500
  ): Promise<
    Array<{
      id: number;
      symbol: string;
      orderId: number;
      price: string;
      qty: string;
      commission: string;
      commissionAsset: string;
      time: number;
      isBuyer: boolean;
      isMaker: boolean;
      isBestMatch: boolean;
    }>
  > {
    try {
      const params: Record<string, string | number> = { limit };
      if (symbol) {
        params.symbol = symbol;
      }

      return await retryWithBackoff(() =>
        this.makeRequest<
          Array<{
            id: number;
            symbol: string;
            orderId: number;
            price: string;
            qty: string;
            commission: string;
            commissionAsset: string;
            time: number;
            isBuyer: boolean;
            isMaker: boolean;
            isBestMatch: boolean;
          }>
        >('/api/v3/myTrades', params, true)
      );
    } catch (error) {
      throw new Error(
        `Failed to get account trades: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Simple ping method to test API connectivity
   */
  async ping(): Promise<void> {
    await this.makeRequest('/api/v3/ping');
  }

  /**
   * Get server time
   */
  async getServerTime(): Promise<number> {
    const response = await this.makeRequest<MEXCTimeResponse>('/api/v3/time');
    return response.serverTime;
  }

  /**
   * Get current prices for multiple symbols
   */
  async getCurrentPrices(symbols?: string[]): Promise<Record<string, string>> {
    try {
      if (!symbols || symbols.length === 0) {
        // Get all ticker data
        const allTickers = await retryWithBackoff(() =>
          this.makeRequest<MEXCTickerResponse[]>('/api/v3/ticker/price')
        );

        const prices: Record<string, string> = {};
        for (const ticker of allTickers) {
          prices[ticker.symbol] = ticker.lastPrice;
        }
        return prices;
      }

      // Get specific symbols
      const prices: Record<string, string> = {};
      const batchSize = 100; // MEXC API limit

      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const symbolParam = batch.join(',');

        try {
          const response = await retryWithBackoff(() =>
            this.makeRequest<MEXCTickerResponse[]>('/api/v3/ticker/price', { symbols: symbolParam })
          );

          for (const ticker of response) {
            prices[ticker.symbol] = ticker.lastPrice;
          }
        } catch (_error) {
          // If batch fails, try individual requests
          console.warn(
            `Batch price request failed for symbols: ${symbolParam}, trying individual requests`
          );

          for (const symbol of batch) {
            try {
              const ticker = await retryWithBackoff(() =>
                this.makeRequest<MEXCTickerResponse>('/api/v3/ticker/price', { symbol })
              );
              prices[symbol] = ticker.lastPrice;
            } catch (symbolError) {
              console.warn(`Failed to get price for ${symbol}:`, symbolError);
              // Set a default price of 0 for failed symbols
              prices[symbol] = '0';
            }
          }
        }
      }

      return prices;
    } catch (error) {
      throw new Error(
        `Failed to get current prices: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Placeholder trading methods for development/testing
   * These methods return simulated data and should be replaced with actual MEXC trading API calls
   */

  async placeOrder(params: {
    symbol: string;
    side: string;
    type: string;
    quantity: number;
    price?: number;
    stopPrice?: number;
    timeInForce?: string;
    newClientOrderId?: string;
  }): Promise<MEXCPlaceOrderResponse> {
    // Placeholder implementation - returns simulated successful order
    return {
      orderId: `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: params.symbol,
      status: 'FILLED',
      executedQty: params.quantity.toString(),
      price: (params.price || 1).toString(),
      fills: [
        {
          price: (params.price || 1).toString(),
          qty: params.quantity.toString(),
          commission: '0.001',
          commissionAsset: 'USDT',
        },
      ],
    };
  }

  async cancelOrder(params: {
    symbol: string;
    orderId?: string;
    origClientOrderId?: string;
  }): Promise<MEXCCancelOrderResponse> {
    // Placeholder implementation - returns simulated cancellation
    return {
      orderId: params.orderId || `ORDER_${Date.now()}`,
      origClientOrderId: params.origClientOrderId,
      symbol: params.symbol,
      status: 'CANCELED',
      origQty: '100.0',
      executedQty: '0.0',
    };
  }

  async getOrder(params: {
    symbol: string;
    orderId?: string;
    origClientOrderId?: string;
  }): Promise<MEXCOrderResponse> {
    // Placeholder implementation - returns simulated order status
    return {
      orderId: params.orderId || `ORDER_${Date.now()}`,
      clientOrderId: params.origClientOrderId,
      symbol: params.symbol,
      side: 'BUY',
      type: 'LIMIT',
      status: 'FILLED',
      origQty: '100.0',
      executedQty: '100.0',
      price: '1.0',
      avgPrice: '1.0',
      timeInForce: 'GTC',
      commission: '0.001',
      commissionAsset: 'USDT',
      time: Date.now(),
      updateTime: Date.now(),
    };
  }

  async getAllOrders(params: {
    symbol?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<MEXCOrderResponse[]> {
    // Placeholder implementation - returns simulated order history
    const sampleOrder: MEXCOrderResponse = {
      orderId: `ORDER_${Date.now()}`,
      clientOrderId: `CLIENT_${Date.now()}`,
      symbol: params.symbol || 'BTCUSDT',
      side: 'BUY',
      type: 'LIMIT',
      status: 'FILLED',
      origQty: '100.0',
      executedQty: '100.0',
      price: '1.0',
      avgPrice: '1.0',
      timeInForce: 'GTC',
      commission: '0.001',
      commissionAsset: 'USDT',
      time: Date.now() - 3600000, // 1 hour ago
      updateTime: Date.now(),
    };

    return [sampleOrder];
  }

  async getAccount(): Promise<{
    canTrade: boolean;
    canWithdraw: boolean;
    canDeposit: boolean;
    updateTime: number;
    permissions: string[];
    balances: Array<{
      asset: string;
      free: string;
      locked: string;
    }>;
  }> {
    // Placeholder implementation - returns simulated account info
    return {
      canTrade: true,
      canWithdraw: true,
      canDeposit: true,
      updateTime: Date.now(),
      permissions: ['SPOT'],
      balances: [
        { asset: 'BTC', free: '1.0', locked: '0.0' },
        { asset: 'USDT', free: '10000.0', locked: '0.0' },
        { asset: 'ETH', free: '10.0', locked: '0.0' },
      ],
    };
  }

  async getTicker24hr(symbol?: string): Promise<
    Array<{
      symbol: string;
      priceChange: string;
      priceChangePercent: string;
      weightedAvgPrice: string;
      prevClosePrice: string;
      lastPrice: string;
      bidPrice: string;
      askPrice: string;
      openPrice: string;
      highPrice: string;
      lowPrice: string;
      volume: string;
      quoteVolume: string;
      openTime: number;
      closeTime: number;
      firstId: number;
      lastId: number;
      count: number;
    }>
  > {
    const params: Record<string, string> = symbol ? { symbol } : {};
    const response = await retryWithBackoff(() =>
      this.makeRequest<
        Array<{
          symbol: string;
          priceChange: string;
          priceChangePercent: string;
          weightedAvgPrice: string;
          prevClosePrice: string;
          lastPrice: string;
          bidPrice: string;
          askPrice: string;
          openPrice: string;
          highPrice: string;
          lowPrice: string;
          volume: string;
          quoteVolume: string;
          openTime: number;
          closeTime: number;
          firstId: number;
          lastId: number;
          count: number;
        }>
      >('/api/v3/ticker/24hr', params)
    );
    return response;
  }

  /**
   * Get new coin calendar for pattern sniper functionality
   */
  async getNewCoinCalendar(): Promise<MEXCCalendarResponse> {
    try {
      const response = await retryWithBackoff(() =>
        this.makeRequest<MEXCCalendarResponse>('/api/operation/new_coin_calendar')
      );
      return response;
    } catch (error) {
      throw new Error(
        `Failed to get new coin calendar: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get symbols V2 data for pattern recognition
   */
  async getSymbolsV2(): Promise<MEXCSymbolsV2Response> {
    try {
      const response = await retryWithBackoff(() =>
        this.makeRequest<MEXCSymbolsV2Response>('/api/platform/spot/market-v2/web/symbolsV2')
      );
      return response;
    } catch (error) {
      throw new Error(
        `Failed to get symbols V2: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export a singleton instance
export const mexcClient = new MEXCApiClient();
