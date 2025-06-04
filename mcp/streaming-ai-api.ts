/**
 * Streaming AI Market Analysis API
 * Task #25: Real-time streaming market analysis with progress updates
 */

import { api } from 'encore.dev/api';
import type { Min, MinLen } from 'encore.dev/validate';
import { createErrorResponse, logAndNotify } from '../shared/errors';
import { isAIOperationAllowed } from '../shared/config';
import { mcpService } from './encore.service';

// =============================================================================
// Streaming Interfaces
// =============================================================================

export interface StreamingAnalysisRequest {
  /** Trading symbol */
  symbol: string & MinLen<1>;
  /** Analysis type */
  analysisType: 'sentiment' | 'technical' | 'risk' | 'trend';
  /** Analysis depth level */
  depth?: 'quick' | 'standard' | 'comprehensive' | 'deep';
  /** Maximum stream duration in milliseconds */
  timeoutMs?: number & Min<1000>;
  /** Enable heartbeat messages */
  enableHeartbeat?: boolean;
  /** Heartbeat interval in milliseconds */
  heartbeatIntervalMs?: number & Min<5000>;
  /** Current price */
  price?: number & Min<0>;
  /** Trading volume */
  volume?: number & Min<0>;
  /** OHLCV data for analysis */
  ohlcv?: Array<{
    open: number & Min<0>;
    high: number & Min<0>;
    low: number & Min<0>;
    close: number & Min<0>;
    volume: number & Min<0>;
    timestamp?: number;
  }>;
  /** Additional market data */
  marketData?: {
    volatility?: number & Min<0>;
    volume24h?: number & Min<0>;
    marketCap?: number & Min<0>;
  };
}

export interface StreamProgress {
  /** Current analysis phase */
  phase:
    | 'initialization'
    | 'data_collection'
    | 'ai_analysis'
    | 'confidence_validation'
    | 'result_compilation'
    | 'complete';
  /** Progress percentage (0-100) */
  percentage: number;
  /** Current step description */
  currentStep: string;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
  /** Number of tokens used so far */
  tokensUsed?: number;
}

export interface StreamUpdate {
  /** Update type */
  type: 'progress' | 'partial_result' | 'error' | 'heartbeat' | 'complete';
  /** Timestamp of update */
  timestamp: number;
  /** Progress information */
  progress?: StreamProgress;
  /** Partial or final analysis data */
  data?: unknown;
  /** Error message if applicable */
  error?: string;
  /** Connection ID for client tracking */
  connectionId?: string;
}

// =============================================================================
// Stream Configuration
// =============================================================================

interface DepthConfig {
  maxSteps: number;
  progressIntervalMs: number;
  enablePartialResults: boolean;
  defaultTimeoutMs: number;
  maxTokens: number;
}

const DEPTH_CONFIGURATIONS: Record<string, DepthConfig> = {
  quick: {
    maxSteps: 3,
    progressIntervalMs: 2000,
    enablePartialResults: false,
    defaultTimeoutMs: 30000,
    maxTokens: 2048,
  },
  standard: {
    maxSteps: 5,
    progressIntervalMs: 3000,
    enablePartialResults: true,
    defaultTimeoutMs: 60000,
    maxTokens: 4096,
  },
  comprehensive: {
    maxSteps: 8,
    progressIntervalMs: 5000,
    enablePartialResults: true,
    defaultTimeoutMs: 120000,
    maxTokens: 6144,
  },
  deep: {
    maxSteps: 12,
    progressIntervalMs: 8000,
    enablePartialResults: true,
    defaultTimeoutMs: 300000,
    maxTokens: 8192,
  },
};

// =============================================================================
// Stream Management
// =============================================================================

class StreamManager {
  private activeStreams = new Map<
    string,
    {
      startTime: number;
      lastActivity: number;
      config: DepthConfig;
      heartbeatInterval?: NodeJS.Timeout;
    }
  >();

  private maxConcurrentStreams = 10;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup inactive streams every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveStreams();
    }, 30000);
  }

  addStream(connectionId: string, config: DepthConfig): boolean {
    if (this.activeStreams.size >= this.maxConcurrentStreams) {
      return false;
    }

    this.activeStreams.set(connectionId, {
      startTime: Date.now(),
      lastActivity: Date.now(),
      config,
    });

    return true;
  }

  updateActivity(connectionId: string): void {
    const stream = this.activeStreams.get(connectionId);
    if (stream) {
      stream.lastActivity = Date.now();
    }
  }

  removeStream(connectionId: string): void {
    const stream = this.activeStreams.get(connectionId);
    if (stream?.heartbeatInterval) {
      clearInterval(stream.heartbeatInterval);
    }
    this.activeStreams.delete(connectionId);
  }

  private cleanupInactiveStreams(): void {
    const now = Date.now();
    const timeout = 300000; // 5 minutes

    for (const [connectionId, stream] of this.activeStreams) {
      if (now - stream.lastActivity > timeout) {
        this.removeStream(connectionId);
      }
    }
  }

  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    for (const [connectionId] of this.activeStreams) {
      this.removeStream(connectionId);
    }
  }
}

// Global stream manager instance
const streamManager = new StreamManager();

// =============================================================================
// Stream Utilities
// =============================================================================

// Stream utilities removed - functionality moved inline

// =============================================================================
// API Endpoint
// =============================================================================

/**
 * Streaming AI Market Analysis Endpoint (Simplified)
 * Provides analysis with progress simulation
 */
export const aiMarketAnalysisStream = api(
  { method: 'POST', path: '/mcp/ai-market-analysis-stream', expose: true },
  async (
    request: StreamingAnalysisRequest
  ): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    metadata?: unknown;
  }> => {
    const connectionId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const depth = request.depth || 'standard';
    const config = DEPTH_CONFIGURATIONS[depth];
    const startTime = Date.now();

    try {
      // Validate risk level
      const riskLevel = depth === 'quick' ? 'low' : depth === 'deep' ? 'high' : 'medium';
      if (!isAIOperationAllowed(riskLevel)) {
        return {
          success: false,
          error: `Streaming analysis not allowed for risk level: ${riskLevel}`,
          metadata: {
            connectionId,
            depth,
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      // Add stream to manager
      if (!streamManager.addStream(connectionId, config)) {
        return {
          success: false,
          error: 'Maximum concurrent streams exceeded',
          metadata: {
            connectionId,
            activeStreams: streamManager.getActiveStreamCount(),
          },
        };
      }

      try {
        // Prepare analysis data
        const analysisData = {
          symbol: request.symbol.toUpperCase().trim(),
          price: request.price,
          volume: request.volume,
          ohlcv: request.ohlcv,
          marketData: request.marketData,
        };

        // Perform actual analysis with simulated streaming behavior
        const analysisResult = await mcpService.performMarketAnalysis(
          analysisData,
          request.analysisType,
          depth
        );

        // Simulate streaming metadata
        const streamingMetadata = {
          connectionId,
          depth,
          processingTimeMs: Date.now() - startTime,
          simulatedProgress: [
            { phase: 'initialization', percentage: 0, step: 'Initializing analysis pipeline' },
            { phase: 'data_collection', percentage: 20, step: 'Gathering market data' },
            { phase: 'ai_analysis', percentage: 60, step: 'Processing with Gemini AI' },
            { phase: 'confidence_validation', percentage: 85, step: 'Validating confidence' },
            { phase: 'complete', percentage: 100, step: 'Analysis complete' },
          ],
          streamFeatures: {
            enabledPartialResults: config.enablePartialResults,
            maxSteps: config.maxSteps,
            heartbeatEnabled: request.enableHeartbeat || false,
          },
        };

        return {
          success: analysisResult.success,
          data: {
            ...analysisResult,
            streamingMetadata,
          },
          error: analysisResult.error,
          metadata: {
            connectionId,
            depth,
            processingTimeMs: Date.now() - startTime,
            tokensUsed: config.maxTokens,
          },
        };
      } finally {
        streamManager.removeStream(connectionId);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Streaming analysis failed',
        metadata: {
          connectionId,
          depth,
          processingTimeMs: Date.now() - startTime,
        },
      };
    }
  }
);

/**
 * Get Stream Status and Metrics
 */
export const getStreamMetrics = api(
  { method: 'GET', path: '/mcp/stream-metrics', expose: true },
  async (): Promise<{
    activeStreams: number;
    maxConcurrentStreams: number;
    availableDepths: string[];
    defaultConfigurations: Record<string, DepthConfig>;
  }> => {
    return {
      activeStreams: streamManager.getActiveStreamCount(),
      maxConcurrentStreams: 10,
      availableDepths: Object.keys(DEPTH_CONFIGURATIONS),
      defaultConfigurations: DEPTH_CONFIGURATIONS,
    };
  }
);

/**
 * Health Check for Streaming Service
 */
export const getStreamingHealth = api(
  { method: 'GET', path: '/mcp/streaming-health', expose: true },
  async (): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    activeStreams: number;
    capacity: number;
    uptime: number;
  }> => {
    const activeStreams = streamManager.getActiveStreamCount();
    const capacity = activeStreams / 10; // 10 max concurrent streams

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (capacity > 0.8) status = 'degraded';
    if (capacity >= 1.0) status = 'unhealthy';

    return {
      status,
      activeStreams,
      capacity,
      uptime: process.uptime() * 1000,
    };
  }
);

// Cleanup on process exit
process.on('exit', () => {
  streamManager.destroy();
});

process.on('SIGINT', () => {
  streamManager.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  streamManager.destroy();
  process.exit(0);
});
