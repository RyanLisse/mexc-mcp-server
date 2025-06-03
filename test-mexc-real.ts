#!/usr/bin/env bun

/**
 * Test MEXC API integration directly
 */

import { marketDataConfig } from './market-data/config.js';
import { mexcClient } from './market-data/mexc-client.js';

async function testMexcIntegration() {
  console.log('🧪 Testing MEXC API Integration...\n');

  try {
    console.log('📋 Configuration Status:');
    console.log(`- Base URL: ${marketDataConfig.mexc.baseUrl}`);
    console.log(
      `- API Key: ${marketDataConfig.mexc.apiKey ? `${marketDataConfig.mexc.apiKey.substring(0, 8)}...` : 'NOT SET'}`
    );
    console.log(
      `- Secret Key: ${marketDataConfig.mexc.secretKey ? `[HIDDEN - Length: ${marketDataConfig.mexc.secretKey.length}]` : 'NOT SET'}`
    );

    if (!marketDataConfig.mexc.apiKey || !marketDataConfig.mexc.secretKey) {
      console.log('\n❌ Missing API credentials in market-data config');
      return;
    }

    console.log('\n🧪 Testing MEXC Client Methods...');

    // Test ping
    console.log('Testing ping...');
    const pingResult = await mexcClient.ping();
    console.log('✅ Ping successful:', pingResult);

    // Test server time
    console.log('Testing server time...');
    const serverTime = await mexcClient.getServerTime();
    console.log('✅ Server time:', new Date(serverTime));

    // Test ticker
    console.log('Testing ticker for BTCUSDT...');
    const tickerResult = await mexcClient.get24hrTicker('BTCUSDT');
    console.log('✅ Ticker result:', tickerResult);

    console.log('\n🎉 MEXC integration test completed successfully!');
  } catch (error) {
    console.error('❌ Error testing MEXC integration:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      });
    }
  }
}

// Run the test
testMexcIntegration().catch(console.error);
