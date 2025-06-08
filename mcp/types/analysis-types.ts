/**
 * Analysis Request/Response Types
 * Extracted from api.ts for better modularity
 */

import type { Max, Min, MinLen } from 'encore.dev/validate';
import type { AIAnalysisResult, AnalysisType } from '../../shared/types/ai-types';

// =============================================================================
// Analysis Request Types
// =============================================================================

/**
 * AI Market Analysis Request with Encore.ts validation
 */
export interface AIMarketAnalysisRequest {
  /** Trading symbol */
  symbol: string & MinLen<1>;
  /** Analysis type */
  analysisType: 'sentiment' | 'technical' | 'risk' | 'trend';
  /** Analysis depth level */
  depth?: 'quick' | 'standard' | 'comprehensive' | 'deep';
  /** Current price */
  price?: number & Min<0>;
  /** Trading volume */
  volume?: number & Min<0>;
  /** OHLCV data for technical/trend analysis */
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
    circulatingSupply?: number & Min<0>;
  };
  /** Analysis parameters */
  parameters?: {
    temperature?: number & Min<0> & Max<2>;
    maxTokens?: number & Min<1> & Max<32768>;
    includeConfidenceIntervals?: boolean;
    contextWindowHours?: number & Min<1> & Max<168>;
  };
}

/**
 * Multi-Analysis Request for comprehensive analysis
 */
export interface MultiAnalysisRequest {
  /** Trading symbol */
  symbol: string & MinLen<1>;
  /** Analysis types to perform */
  analysisTypes: ('sentiment' | 'technical' | 'risk' | 'trend')[];
  /** Analysis depth level */
  depth?: 'comprehensive' | 'deep';
  /** Current price */
  price?: number & Min<0>;
  /** Trading volume */
  volume?: number & Min<0>;
  /** OHLCV data */
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
    circulatingSupply?: number & Min<0>;
  };
}

// =============================================================================
// Analysis Response Types
// =============================================================================

/**
 * Analysis Response Interface
 */
export interface AnalysisResponse {
  /** Whether analysis succeeded */
  success: boolean;
  /** Analysis result data */
  data?: AIAnalysisResult;
  /** Error message if failed */
  error?: string;
  /** Analysis metadata */
  metadata?: {
    analysisType: AnalysisType;
    depth: string;
    processingTimeMs: number;
    timestamp: number;
    modelVersion?: string;
    confidenceValidated?: boolean;
  };
}

/**
 * Multi-Analysis Response Interface
 */
export interface MultiAnalysisResponse {
  /** Whether analysis succeeded */
  success: boolean;
  /** Analysis results by type */
  data?: Record<AnalysisType, AIAnalysisResult>;
  /** Error message if failed */
  error?: string;
  /** Analysis metadata */
  metadata?: {
    depth: string;
    totalProcessingTimeMs: number;
    timestamp: number;
    analysisTypes: AnalysisType[];
    successfulAnalyses: number;
    failedAnalyses: number;
  };
}

/**
 * Service Health Response
 */
export interface ServiceHealthResponse {
  /** Service health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Budget usage information */
  budgetStatus?: {
    tokensUsed: number;
    tokensRemaining: number;
    costUSD: number;
    requestCount: number;
  };
  /** Cache performance metrics */
  cacheStats?: {
    hits: number;
    misses: number;
    hitRate: number;
    totalEntries: number;
  };
  /** Service configuration */
  configuration?: {
    model: string;
    temperature: number;
    maxTokensPerRequest: number;
    cacheTTLMinutes: number;
  };
}
