import { describe, it, expect, beforeEach } from "bun:test";
import {
  executeGetTicker,
  executeGetOrderBook,
  executeGet24hStats,
  clearMarketDataCache,
  getMarketDataCacheSize,
  GetTickerInputSchema,
  GetOrderBookInputSchema,
  Get24hStatsInputSchema,
  TickerDataSchema,
  OrderBookDataSchema,
  Stats24hDataSchema,
  marketDataTools,
} from "./tools";

describe("Market Data Tools", () => {
  beforeEach(() => {
    clearMarketDataCache();
  });

  describe("Ticker Tool", () => {
    it("should fetch ticker data for valid symbol", async () => {
      const input = { symbol: "BTCUSDT" }; // Updated to MEXC format
      const result = await executeGetTicker(input);
      
      expect(result.data).toBeDefined();
      expect(result.data.symbol).toBe("BTCUSDT");
      expect(result.data.price).toMatch(/^\d+\.?\d*$/);
      expect(result.data.timestamp).toBeGreaterThan(0);
      expect(result.cached).toBe(false);
    });

    it("should return cached data on second request", async () => {
      const input = { symbol: "BTCUSDT" };
      
      // First request
      const result1 = await executeGetTicker(input);
      expect(result1.cached).toBe(false);
      
      // Second request should be cached
      const result2 = await executeGetTicker(input);
      expect(result2.cached).toBe(true);
      expect(result2.data.symbol).toBe(result1.data.symbol);
    });

    it("should validate ticker data schema", async () => {
      const input = { symbol: "ETHUSDT" };
      const result = await executeGetTicker(input);
      
      // Validate the response against schema
      const validation = TickerDataSchema.safeParse(result.data);
      expect(validation.success).toBe(true);
    });

    it("should reject invalid symbol format", async () => {
      const input = { symbol: "INVALID_FORMAT_SYMBOL" };
      
      await expect(executeGetTicker(input)).rejects.toThrow();
    });

    it("should handle optional convert parameter", async () => {
      const input = { symbol: "BTCUSDT", convert: "USD" };
      const result = await executeGetTicker(input);
      
      expect(result.data).toBeDefined();
      expect(result.data.symbol).toBe("BTCUSDT");
    });
  });

  describe("Order Book Tool", () => {
    it("should fetch order book data for valid symbol", async () => {
      const input = { symbol: "BTCUSDT", limit: 50 };
      const result = await executeGetOrderBook(input);
      
      expect(result.data).toBeDefined();
      expect(result.data.symbol).toBe("BTCUSDT");
      expect(Array.isArray(result.data.bids)).toBe(true);
      expect(Array.isArray(result.data.asks)).toBe(true);
      expect(result.data.bids.length).toBeGreaterThan(0);
      expect(result.data.asks.length).toBeGreaterThan(0);
      expect(result.cached).toBe(false);
    });

    it("should use default limit when not specified", async () => {
      const input = { symbol: "BTCUSDT" };
      const result = await executeGetOrderBook(input);
      
      expect(result.data).toBeDefined();
      expect(result.data.bids.length + result.data.asks.length).toBeGreaterThan(0);
    });

    it("should validate order book data schema", async () => {
      const input = { symbol: "ETHUSDT", limit: 20 };
      const result = await executeGetOrderBook(input);
      
      const validation = OrderBookDataSchema.safeParse(result.data);
      expect(validation.success).toBe(true);
    });

    it("should enforce limit constraints", async () => {
      // Test minimum limit
      await expect(executeGetOrderBook({ symbol: "BTCUSDT", limit: 2 }))
        .rejects.toThrow();
      
      // Test maximum limit
      await expect(executeGetOrderBook({ symbol: "BTCUSDT", limit: 1500 }))
        .rejects.toThrow();
    });

    it("should return cached data on second request", async () => {
      const input = { symbol: "BTCUSDT", limit: 50 };
      
      const result1 = await executeGetOrderBook(input);
      expect(result1.cached).toBe(false);
      
      const result2 = await executeGetOrderBook(input);
      expect(result2.cached).toBe(true);
    });

    it("should validate bid/ask format", async () => {
      const input = { symbol: "BTCUSDT", limit: 10 };
      const result = await executeGetOrderBook(input);
      
      // Check that bids and asks are arrays of [price, quantity] tuples
      for (const bid of result.data.bids) {
        expect(Array.isArray(bid)).toBe(true);
        expect(bid.length).toBe(2);
        expect(typeof bid[0]).toBe('string'); // price
        expect(typeof bid[1]).toBe('string'); // quantity
      }
      
      for (const ask of result.data.asks) {
        expect(Array.isArray(ask)).toBe(true);
        expect(ask.length).toBe(2);
        expect(typeof ask[0]).toBe('string'); // price
        expect(typeof ask[1]).toBe('string'); // quantity
      }
    });
  });

  describe("24h Statistics Tool", () => {
    it("should fetch 24h stats for specific symbol", async () => {
      const input = { symbol: "BTCUSDT" };
      const result = await executeGet24hStats(input);
      
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].symbol).toBe("BTCUSDT");
      expect(result.cached).toBe(false);
    });

    it("should fetch 24h stats for all symbols when no symbol specified", async () => {
      const input = {};
      const result = await executeGet24hStats(input);
      
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(1);
    });

    it("should validate 24h stats data schema", async () => {
      const input = { symbol: "ETHUSDT" };
      const result = await executeGet24hStats(input);
      
      for (const stat of result.data) {
        const validation = Stats24hDataSchema.safeParse(stat);
        expect(validation.success).toBe(true);
      }
    });

    it("should return cached data on second request", async () => {
      const input = { symbol: "BTCUSDT" };
      
      const result1 = await executeGet24hStats(input);
      expect(result1.cached).toBe(false);
      
      const result2 = await executeGet24hStats(input);
      expect(result2.cached).toBe(true);
    });

    it("should include required statistical fields", async () => {
      const input = { symbol: "BTCUSDT" };
      const result = await executeGet24hStats(input);
      
      const stat = result.data[0];
      expect(stat.volume).toBeDefined();
      expect(stat.volumeQuote).toBeDefined();
      expect(stat.priceChange).toBeDefined();
      expect(stat.priceChangePercent).toBeDefined();
      expect(stat.high).toBeDefined();
      expect(stat.low).toBeDefined();
      expect(stat.trades).toBeGreaterThanOrEqual(0); // Updated to handle 0 trades
      expect(stat.timestamp).toBeGreaterThan(0);
    });
  });

  describe("Input Validation Schemas", () => {
    it("should validate GetTickerInput schema", () => {
      const validInput = { symbol: "BTCUSDT" }; // Updated format
      const result = GetTickerInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      
      const invalidInput = { symbol: "invalid-format" };
      const result2 = GetTickerInputSchema.safeParse(invalidInput);
      expect(result2.success).toBe(false);
    });

    it("should validate GetOrderBookInput schema", () => {
      const validInput = { symbol: "BTCUSDT", limit: 50 };
      const result = GetOrderBookInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      
      const invalidInput = { symbol: "BTCUSDT", limit: 2000 };
      const result2 = GetOrderBookInputSchema.safeParse(invalidInput);
      expect(result2.success).toBe(false);
    });

    it("should validate Get24hStatsInput schema", () => {
      const validInput = { symbol: "BTCUSDT" };
      const result = Get24hStatsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      
      const validInputEmpty = {};
      const result2 = Get24hStatsInputSchema.safeParse(validInputEmpty);
      expect(result2.success).toBe(true);
    });
  });

  describe("Cache Management", () => {
    it("should track cache size correctly", async () => {
      expect(getMarketDataCacheSize()).toBe(0);
      
      await executeGetTicker({ symbol: "BTCUSDT" });
      expect(getMarketDataCacheSize()).toBe(1);
      
      await executeGetOrderBook({ symbol: "BTCUSDT" });
      expect(getMarketDataCacheSize()).toBe(2);
      
      clearMarketDataCache();
      expect(getMarketDataCacheSize()).toBe(0);
    });

    it("should have different cache keys for different parameters", async () => {
      await executeGetOrderBook({ symbol: "BTCUSDT", limit: 50 });
      await executeGetOrderBook({ symbol: "BTCUSDT", limit: 100 });
      
      // Should have 2 different cache entries
      expect(getMarketDataCacheSize()).toBe(2);
    });

    it("should clear cache properly", async () => {
      await executeGetTicker({ symbol: "BTCUSDT" });
      await executeGetOrderBook({ symbol: "ETHUSDT" });
      
      expect(getMarketDataCacheSize()).toBeGreaterThan(0);
      
      clearMarketDataCache();
      expect(getMarketDataCacheSize()).toBe(0);
    });
  });

  describe("Tools Configuration", () => {
    it("should export all market data tools", () => {
      expect(marketDataTools).toBeDefined();
      expect(Array.isArray(marketDataTools)).toBe(true);
      expect(marketDataTools.length).toBe(6); // Updated count: ticker, orderbook, stats, connectivity, auth, symbols
      
      const toolNames = marketDataTools.map(tool => tool.name);
      expect(toolNames).toContain('mexc_get_ticker');
      expect(toolNames).toContain('mexc_get_order_book');
      expect(toolNames).toContain('mexc_get_24h_stats');
      expect(toolNames).toContain('mexc_test_connectivity');
      expect(toolNames).toContain('mexc_test_authentication');
      expect(toolNames).toContain('mexc_get_active_symbols');
    });

    it("should have valid tool schemas", () => {
      for (const tool of marketDataTools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed input gracefully", async () => {
      await expect(executeGetTicker(null)).rejects.toThrow();
      await expect(executeGetTicker({})).rejects.toThrow();
      await expect(executeGetTicker({ symbol: 123 })).rejects.toThrow();
    });

    it("should provide meaningful error messages", async () => {
      try {
        await executeGetTicker({ symbol: "INVALID123" });
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain("Failed to fetch ticker data");
      }
    });
  });

  describe("Performance", () => {
    it("should execute ticker requests in reasonable time", async () => {
      const start = Date.now();
      await executeGetTicker({ symbol: "BTCUSDT" });
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(5000); // Increased tolerance for real API calls
    });

    it("should handle concurrent requests", async () => {
      const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];
      
      const promises = symbols.map(symbol => executeGetTicker({ symbol }));
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(3);
      for (let i = 0; i < results.length; i++) {
        expect(results[i].data.symbol).toBe(symbols[i]);
      }
    });
  });
});
