/**
 * Streaming AI Market Analysis Client Example
 * Task #25: Demonstrates how to consume the streaming endpoint
 */

import type { StreamingAnalysisRequest } from '../mcp/streaming-ai-api';

// Example client class for consuming streaming analysis
export class StreamingAnalysisClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:4000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Perform streaming analysis with progress monitoring
   */
  async performAnalysis(request: StreamingAnalysisRequest): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    metadata?: unknown;
  }> {
    try {
      console.log(`🚀 Starting streaming analysis for ${request.symbol}`);
      console.log(`📊 Analysis Type: ${request.analysisType}`);
      console.log(`🔍 Depth: ${request.depth || 'standard'}`);
      console.log('');

      const response = await fetch(`${this.baseUrl}/mcp/ai-market-analysis-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Display progress simulation if available
      if (result.data?.streamingMetadata?.simulatedProgress) {
        console.log('📈 Simulated Streaming Progress:');
        for (const progress of result.data.streamingMetadata.simulatedProgress) {
          console.log(`  ${progress.percentage}% - ${progress.phase}: ${progress.step}`);
        }
        console.log('');
      }

      // Display stream features
      if (result.data?.streamingMetadata?.streamFeatures) {
        const features = result.data.streamingMetadata.streamFeatures;
        console.log('🔧 Stream Features:');
        console.log(`  Partial Results: ${features.enabledPartialResults}`);
        console.log(`  Max Steps: ${features.maxSteps}`);
        console.log(`  Heartbeat: ${features.heartbeatEnabled}`);
        console.log('');
      }

      // Display metadata
      if (result.metadata) {
        console.log('📋 Analysis Metadata:');
        console.log(`  Connection ID: ${result.metadata.connectionId}`);
        console.log(`  Processing Time: ${result.metadata.processingTimeMs}ms`);
        console.log(`  Tokens Used: ${result.metadata.tokensUsed}`);
        console.log('');
      }

      return result;
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get streaming service metrics
   */
  async getMetrics(): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/mcp/stream-metrics`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get metrics:', error);
      return null;
    }
  }

  /**
   * Check streaming service health
   */
  async checkHealth(): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/mcp/streaming-health`);
      return await response.json();
    } catch (error) {
      console.error('Failed to check health:', error);
      return null;
    }
  }
}

// Example usage demonstrations
export async function demonstrateQuickAnalysis() {
  console.log('='.repeat(60));
  console.log('🚀 STREAMING AI ANALYSIS - QUICK DEMO');
  console.log('='.repeat(60));

  const client = new StreamingAnalysisClient();

  const request: StreamingAnalysisRequest = {
    symbol: 'BTCUSDT',
    analysisType: 'sentiment',
    depth: 'quick',
    timeoutMs: 30000,
    enableHeartbeat: false,
    price: 50000,
    volume: 1000000,
  };

  const result = await client.performAnalysis(request);

  if (result.success) {
    console.log('✅ Analysis completed successfully!');
    console.log('🎯 Results:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Analysis failed:', result.error);
  }

  console.log('');
}

export async function demonstrateComprehensiveAnalysis() {
  console.log('='.repeat(60));
  console.log('🚀 STREAMING AI ANALYSIS - COMPREHENSIVE DEMO');
  console.log('='.repeat(60));

  const client = new StreamingAnalysisClient();

  const request: StreamingAnalysisRequest = {
    symbol: 'ETHUSDT',
    analysisType: 'technical',
    depth: 'comprehensive',
    timeoutMs: 120000,
    enableHeartbeat: true,
    heartbeatIntervalMs: 10000,
    ohlcv: [
      { open: 3000, high: 3100, low: 2950, close: 3050, volume: 500000 },
      { open: 3050, high: 3150, low: 3000, close: 3120, volume: 550000 },
      { open: 3120, high: 3200, low: 3080, close: 3180, volume: 600000 },
    ],
    marketData: {
      volatility: 0.025,
      volume24h: 50000000,
      marketCap: 350000000000,
    },
  };

  const result = await client.performAnalysis(request);

  if (result.success) {
    console.log('✅ Comprehensive analysis completed!');
    console.log('🎯 Results:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Analysis failed:', result.error);
  }

  console.log('');
}

export async function demonstrateServiceMonitoring() {
  console.log('='.repeat(60));
  console.log('📊 STREAMING SERVICE MONITORING');
  console.log('='.repeat(60));

  const client = new StreamingAnalysisClient();

  // Check service health
  console.log('🏥 Checking service health...');
  const health = await client.checkHealth();
  if (health) {
    console.log(`Status: ${health.status}`);
    console.log(`Active Streams: ${health.activeStreams}`);
    console.log(`Capacity: ${(health.capacity * 100).toFixed(1)}%`);
    console.log(`Uptime: ${(health.uptime / 1000).toFixed(0)}s`);
  }

  console.log('');

  // Get service metrics
  console.log('📈 Getting service metrics...');
  const metrics = await client.getMetrics();
  if (metrics) {
    console.log(`Active Streams: ${metrics.activeStreams}`);
    console.log(`Max Concurrent: ${metrics.maxConcurrentStreams}`);
    console.log(`Available Depths: ${metrics.availableDepths.join(', ')}`);
  }

  console.log('');
}

// Main demonstration function
export async function runAllDemonstrations() {
  try {
    await demonstrateQuickAnalysis();
    await demonstrateComprehensiveAnalysis();
    await demonstrateServiceMonitoring();

    console.log('🎉 All demonstrations completed successfully!');
  } catch (error) {
    console.error('❌ Demonstration failed:', error);
  }
}

// Export for testing
export { StreamingAnalysisClient };

// Run demonstrations if this file is executed directly
if (import.meta.main) {
  runAllDemonstrations().catch(console.error);
}
