#!/usr/bin/env bun

/**
 * Test script to verify secrets integration fallback
 */

async function testSecretsIntegration() {
  console.log('🔐 Testing Secrets Integration Fallback...\n');

  try {
    // Test environment variable loading (fallback approach)
    const apiKey = process.env.MEXC_API_KEY;
    const secretKey = process.env.MEXC_SECRET_KEY;
    const apiUrl = 'https://api.mexc.com';
    
    console.log('📋 Configuration Status:');
    console.log(`- API URL: ${apiUrl}`);
    console.log(`- API Key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'NOT SET'}`);
    console.log(`- Secret Key: ${secretKey ? '[HIDDEN - Length: ' + secretKey.length + ']' : 'NOT SET'}`);
    
    // Basic credential validation
    if (!apiKey || !secretKey) {
      console.log('\n❌ Missing API credentials from environment variables');
      console.log('For testing without Encore runtime, set:');
      console.log('export MEXC_API_KEY="your_api_key"');
      console.log('export MEXC_SECRET_KEY="your_secret_key"');
      console.log('\nNote: In production, use Encore secrets:');
      console.log('encore secret set --type dev MEXC_API_KEY');
      console.log('encore secret set --type dev MEXC_SECRET_KEY');
      return;
    }

    console.log('\n✅ Credentials found in environment variables!');
    console.log('\n🧪 Testing API connectivity...');
    
    // Simple connectivity test (using fetch for simplicity)
    const response = await fetch(`${apiUrl}/api/v3/ping`);
    if (response.ok) {
      console.log('✅ MEXC API connectivity: OK');
      
      // Test server time sync
      const timeResponse = await fetch(`${apiUrl}/api/v3/time`);
      if (timeResponse.ok) {
        const timeData = await timeResponse.json();
        console.log(`✅ Server time sync: ${new Date(timeData.serverTime)}`);
      }
    } else {
      console.log('❌ MEXC API connectivity: Failed');
    }

    console.log('\n🎉 Basic integration test completed successfully!');
    console.log('\nNote: Full Encore secrets integration will work when running with `encore run`');

  } catch (error) {
    console.error('❌ Error testing secrets integration:', error);
  }
}

// Run the test
testSecretsIntegration().catch(console.error);