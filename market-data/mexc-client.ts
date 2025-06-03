import { config } from "../shared/config.js";
import { retryWithBackoff } from "../shared/utils/index.js";
import type { TickerData, OrderBookData, Stats24hData } from "./tools.js";

/**
 * MEXC API Client for interacting with the MEXC exchange
 */
export class MEXCApiClient {
  private baseUrl: string;
  private apiKey: string;
  private secretKey: string;

  constructor() {
    this.baseUrl = config.mexc.baseUrl;
    this.apiKey = config.mexc.apiKey;
    this.secretKey = config.mexc.secretKey;
  }

  /**
   * Generate HMAC signature for authenticated requests
   */
  private generateSignature(queryString: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Create query string from parameters
   */
  private createQueryString(params: Record<string, any>): string {
    return Object.keys(params)
      .sort()
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
  }

  /**
   * Make HTTP request to MEXC API
   */
  private async makeRequest<T>(
    endpoint: string, 
    params: Record<string, any> = {},
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

      const data = await response.json();
      
      // Handle MEXC API error responses
      if (data.code && data.code !== 200) {
        throw new Error(`MEXC API error: ${data.msg || 'Unknown error'}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to call MEXC API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get ticker data for a symbol
   */
  async getTicker(symbol: string): Promise<TickerData> {
    try {
      const response = await retryWithBackoff(() => 
        this.makeRequest<any>('/api/v3/ticker/24hr', { symbol })
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
        count: response.count,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to get ticker for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get order book data for a symbol
   */
  async getOrderBook(symbol: string, limit: number): Promise<OrderBookData> {
    try {
      const response = await retryWithBackoff(() => 
        this.makeRequest<any>('/api/v3/depth', { symbol, limit })
      );

      // Transform MEXC response to our format
      return {
        symbol,
        bids: response.bids.map((bid: string[]) => [bid[0], bid[1]] as [string, string]),
        asks: response.asks.map((ask: string[]) => [ask[0], ask[1]] as [string, string]),
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to get order book for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get 24h statistics for symbols
   */
  async get24hStats(symbol?: string): Promise<Stats24hData[]> {
    try {
      const params = symbol ? { symbol } : {};
      const response = await retryWithBackoff(() => 
        this.makeRequest<any>('/api/v3/ticker/24hr', params)
      );

      // Handle both single symbol and multiple symbols responses
      const data = Array.isArray(response) ? response : [response];

      return data.map((item: any) => ({
        symbol: item.symbol,
        volume: item.volume,
        volumeQuote: item.quoteVolume,
        priceChange: item.priceChange,
        priceChangePercent: item.priceChangePercent,
        high: item.highPrice,
        low: item.lowPrice,
        trades: item.count,
        timestamp: Date.now(),
      }));
    } catch (error) {
      throw new Error(`Failed to get 24h stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get account information (requires authentication)
   */
  async getAccountInfo(): Promise<any> {
    try {
      return await retryWithBackoff(() => 
        this.makeRequest<any>('/api/v3/account', {}, true)
      );
    } catch (error) {
      throw new Error(`Failed to get account info: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const timeResponse = await this.makeRequest<{ serverTime: number }>('/api/v3/time');
      const serverTime = timeResponse.serverTime;
      const localTime = Date.now();
      const timeDiff = Math.abs(serverTime - localTime);
      
      if (timeDiff > 5000) {
        return {
          success: false,
          message: `Server time difference too large: ${timeDiff}ms`
        };
      }

      return {
        success: true,
        message: 'Connectivity test successful'
      };
    } catch (error) {
      return {
        success: false,
        message: `Connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        message: 'Authentication test successful'
      };
    } catch (error) {
      return {
        success: false,
        message: `Authentication test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get exchange information
   */
  async getExchangeInfo(): Promise<any> {
    try {
      return await retryWithBackoff(() => 
        this.makeRequest<any>('/api/v3/exchangeInfo')
      );
    } catch (error) {
      throw new Error(`Failed to get exchange info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all active trading symbols
   */
  async getActiveSymbols(): Promise<string[]> {
    try {
      const exchangeInfo = await this.getExchangeInfo();
      return exchangeInfo.symbols
        .filter((s: any) => s.status === 'TRADING')
        .map((s: any) => s.symbol);
    } catch (error) {
      throw new Error(`Failed to get active symbols: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const mexcClient = new MEXCApiClient();
