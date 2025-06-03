#!/usr/bin/env bun
/**
 * Test script for MEXC API integration
 * Run: bun run test-mexc-api.ts
 */

import { mexcClient } from "./market-data/mexc-client.js";
import { executeGetTicker, executeGetOrderBook, executeGet24hStats, healthCheck } from "./market-data/tools.js";
import { config, validateMexcCredentials } from "./shared/config.js";

async function main() {
  console.log("🚀 Testing MEXC API Integration...\n");

  // 1. Test configuration
  console.log("1. Testing Configuration:");
  console.log(`   API Key: ${config.mexc.apiKey.substring(0, 8)}...`);
  console.log(`   Base URL: ${config.mexc.baseUrl}`);
  console.log(`   Credentials Valid: ${validateMexcCredentials()}\n`);

  // 2. Test connectivity
  console.log("2. Testing Connectivity:");
  try {
    const connectivityResult = await mexcClient.testConnectivity();
    console.log(`   Status: ${connectivityResult.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Message: ${connectivityResult.message}\n`);
  } catch (error) {
    console.log(`   Status: ❌ FAIL`);
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  // 3. Test authentication (optional - only if needed)
  console.log("3. Testing Authentication:");
  try {
    const authResult = await mexcClient.testAuthentication();
    console.log(`   Status: ${authResult.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Message: ${authResult.message}\n`);
  } catch (error) {
    console.log(`   Status: ❌ FAIL`);
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  // 4. Test market data endpoints
  console.log("4. Testing Market Data Endpoints:");
  
  // Test ticker
  try {
    console.log("   Testing Ticker (BTC/USDT):");
    const tickerResult = await executeGetTicker({ symbol: "BTCUSDT" });
    console.log(`   Status: ✅ PASS`);
    console.log(`   Price: $${tickerResult.data.price}`);
    console.log(`   24h Change: ${tickerResult.data.priceChangePercent}%`);
    console.log(`   Volume: ${tickerResult.data.volume} BTC`);
    console.log(`   Cached: ${tickerResult.cached}\n`);
  } catch (error) {
    console.log(`   Status: ❌ FAIL`);
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  // Test order book
  try {
    console.log("   Testing Order Book (BTC/USDT):");
    const orderBookResult = await executeGetOrderBook({ symbol: "BTCUSDT", limit: 10 });
    console.log(`   Status: ✅ PASS`);
    console.log(`   Best Bid: $${orderBookResult.data.bids[0]?.[0]} (${orderBookResult.data.bids[0]?.[1]} BTC)`);
    console.log(`   Best Ask: $${orderBookResult.data.asks[0]?.[0]} (${orderBookResult.data.asks[0]?.[1]} BTC)`);
    console.log(`   Cached: ${orderBookResult.cached}\n`);
  } catch (error) {
    console.log(`   Status: ❌ FAIL`);
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  // Test 24h stats
  try {
    console.log("   Testing 24h Stats (ETH/USDT):");
    const statsResult = await executeGet24hStats({ symbol: "ETHUSDT" });
    console.log(`   Status: ✅ PASS`);
    const stat = statsResult.data[0];
    console.log(`   Symbol: ${stat.symbol}`);
    console.log(`   24h Volume: ${stat.volume} ETH`);
    console.log(`   24h High: $${stat.high}`);
    console.log(`   24h Low: $${stat.low}`);
    console.log(`   Trades: ${stat.trades}`);
    console.log(`   Cached: ${statsResult.cached}\n`);
  } catch (error) {
    console.log(`   Status: ❌ FAIL`);
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  // 5. Test health check
  console.log("5. Testing Health Check:");
  try {
    const health = await healthCheck();
    console.log(`   Overall Status: ${health.status === 'healthy' ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    
    for (const [checkName, checkResult] of Object.entries(health.checks)) {
      console.log(`   ${checkName}: ${checkResult.status === 'pass' ? '✅' : '❌'} ${checkResult.message}`);
    }
  } catch (error) {
    console.log(`   Status: ❌ FAIL`);
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log("\n🎉 MEXC API Integration Test Complete!");
}

// Handle errors gracefully
main().catch(error => {
  console.error("\n💥 Test script failed:");
  console.error(error);
  process.exit(1);
});
