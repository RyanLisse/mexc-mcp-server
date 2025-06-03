/**
 * AI-specific TypeScript interfaces for Gemini 2.5 Flash integration
 * Comprehensive type definitions for AI analysis, streaming, and responses
 */

import type { Max, Min, MinLen } from 'encore.dev/validate';

// =============================================================================
// Core AI Analysis Interfaces
// =============================================================================

/**
 * Base interface for all AI analysis results
 * Contains common fields used across different analysis types
 */
export interface AIAnalysisResult {
  /** Whether the analysis completed successfully */
  success: boolean;
  /** Analysis result data (varies by analysis type) */
  data?: unknown;
  /** Error message if analysis failed */
  error?: string;
  /** Model version used for analysis */
  modelVersion?: string;
  /** Timestamp when analysis was performed */
  timestamp?: number;
  /** Processing duration in milliseconds */
  processingTimeMs?: number;
}

/**
 * Enhanced analysis response with additional metadata
 * Extends base result with comprehensive context information
 */
export interface EnhancedAnalysisResponse extends AIAnalysisResult {
  /** Confidence score between 0 and 1 */
  confidence: number & Min<0> & Max<1>;
  /** Token usage statistics for the analysis */
  usage?: TokenUsage;
  /** Cache status information */
  cacheInfo?: CacheInfo;
  /** Analysis context and parameters */
  context?: AnalysisContext;
  /** Additional metadata from the AI model */
  metadata?: Record<string, unknown>;
}

/**
 * Market sentiment analysis result
 * Specialized analysis for cryptocurrency market sentiment
 */
export interface SentimentAnalysisResult extends EnhancedAnalysisResponse {
  data: {
    /** Overall market sentiment */
    sentiment: 'bullish' | 'bearish' | 'neutral';
    /** Confidence in sentiment assessment (0-1) */
    confidence: number & Min<0> & Max<1>;
    /** Risk level assessment */
    riskLevel: 'low' | 'medium' | 'high';
    /** Actionable recommendations */
    recommendations: string[];
    /** Detailed sentiment breakdown */
    breakdown?: {
      /** Price sentiment score (-1 to 1) */
      priceScore: number & Min<-1> & Max<1>;
      /** Volume sentiment score (-1 to 1) */
      volumeScore: number & Min<-1> & Max<1>;
      /** Market momentum score (-1 to 1) */
      momentumScore: number & Min<-1> & Max<1>;
    };
  };
}

/**
 * Technical analysis result for market data
 * Comprehensive technical analysis with support/resistance levels
 */
export interface TechnicalAnalysisResult extends EnhancedAnalysisResponse {
  data: {
    /** Price action description */
    priceAction: string;
    /** Volume analysis description */
    volume: string;
    /** Momentum analysis description */
    momentum: string;
    /** Support levels identified */
    support: number[];
    /** Resistance levels identified */
    resistance: number[];
    /** Trend direction */
    direction?: 'up' | 'down' | 'sideways';
    /** Trend strength (0-1) */
    strength?: number & Min<0> & Max<1>;
  };
}

/**
 * Risk assessment result for trading positions
 * Detailed risk evaluation with mitigation strategies
 */
export interface RiskAssessment extends EnhancedAnalysisResponse {
  data: {
    /** Overall risk level */
    riskLevel: 'low' | 'medium' | 'high';
    /** Risk confidence score (0-1) */
    confidence: number & Min<0> & Max<1>;
    /** Risk mitigation recommendations */
    recommendations: string[];
    /** Detailed risk factors */
    riskFactors?: {
      /** Market volatility risk (0-1) */
      volatilityRisk: number & Min<0> & Max<1>;
      /** Liquidity risk (0-1) */
      liquidityRisk: number & Min<0> & Max<1>;
      /** Position size risk (0-1) */
      positionSizeRisk: number & Min<0> & Max<1>;
      /** Correlation risk (0-1) */
      correlationRisk: number & Min<0> & Max<1>;
    };
    /** Potential loss scenarios */
    lossScenarios?: Array<{
      /** Scenario name */
      scenario: string;
      /** Probability of occurrence (0-1) */
      probability: number & Min<0> & Max<1>;
      /** Potential loss percentage */
      potentialLoss: number;
    }>;
  };
}

/**
 * Portfolio optimization analysis result
 * Specialized analysis for optimizing trading portfolios and risk-return profiles
 */
export interface OptimizationResult extends EnhancedAnalysisResponse {
  data: {
    /** Type of optimization performed */
    optimizationType: 'portfolio' | 'risk' | 'return' | 'sharpe';
    /** Optimization confidence score (0-1) */
    confidence: number & Min<0> & Max<1>;
    /** Optimized performance metrics */
    optimizedMetrics: {
      /** Expected return improvement */
      expectedReturn?: number;
      /** Risk reduction achieved */
      riskReduction?: number;
      /** Sharpe ratio improvement */
      sharpeRatio?: number;
      /** Maximum drawdown */
      maxDrawdown?: number;
    };
    /** Optimization recommendations */
    recommendations: string[];
    /** Optimized asset allocations */
    allocations?: Array<{
      /** Asset symbol */
      symbol: string & MinLen<1>;
      /** Current allocation weight (0-1) */
      currentWeight: number & Min<0> & Max<1>;
      /** Optimized allocation weight (0-1) */
      optimizedWeight: number & Min<0> & Max<1>;
      /** Recommended adjustment */
      adjustment: number;
    }>;
    /** Backtest results for optimization */
    backtestResults?: {
      /** Backtest period in months */
      periodMonths: number & Min<1>;
      /** Total return achieved */
      totalReturn: number;
      /** Portfolio volatility */
      volatility: number & Min<0>;
      /** Maximum drawdown */
      maxDrawdown: number;
      /** Win rate percentage */
      winRate: number & Min<0> & Max<1>;
    };
  };
}

// =============================================================================
// Streaming Analysis Interfaces
// =============================================================================

/**
 * Real-time streaming analysis update
 * Used for progressive analysis results during long-running operations
 */
export interface StreamingAnalysisUpdate {
  /** Update sequence number */
  sequence: number;
  /** Whether this is the final update */
  isFinal: boolean;
  /** Progress percentage (0-100) */
  progress: number & Min<0> & Max<100>;
  /** Current analysis stage */
  stage: AnalysisStage;
  /** Partial results available so far */
  partialResults?: Partial<AIAnalysisResult>;
  /** Status message for current operation */
  statusMessage?: string;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemainingMs?: number;
}

/**
 * Analysis stages for streaming operations
 */
export type AnalysisStage =
  | 'initializing'
  | 'data_preprocessing'
  | 'feature_extraction'
  | 'model_inference'
  | 'post_processing'
  | 'finalizing'
  | 'completed'
  | 'error';

// =============================================================================
// Request/Response Interfaces
// =============================================================================

/**
 * Base AI analysis request interface
 * Common fields for all AI analysis requests
 */
export interface AIAnalysisRequest {
  /** Analysis type identifier */
  analysisType: AnalysisType;
  /** Input data for analysis */
  data: unknown;
  /** Optional analysis parameters */
  parameters?: AnalysisParameters;
  /** Whether to enable streaming updates */
  enableStreaming?: boolean;
  /** Request timeout in milliseconds */
  timeoutMs?: number & Min<1000> & Max<300000>;
}

/**
 * Market sentiment analysis request
 */
export interface SentimentAnalysisRequest extends AIAnalysisRequest {
  analysisType: 'sentiment';
  data: {
    /** Trading symbol */
    symbol: string & MinLen<1>;
    /** Current price */
    price?: number & Min<0>;
    /** Trading volume */
    volume?: number & Min<0>;
    /** Historical prices */
    prices?: number[];
    /** Historical volumes */
    volumes?: number[];
    /** Analysis timestamp */
    timestamp?: number;
  };
}

/**
 * Technical analysis request
 */
export interface TechnicalAnalysisRequest extends AIAnalysisRequest {
  analysisType: 'technical';
  data: {
    /** Trading symbol */
    symbol: string & MinLen<1>;
    /** OHLCV data for analysis */
    ohlcv: Array<{
      /** Opening price */
      open: number & Min<0>;
      /** Highest price */
      high: number & Min<0>;
      /** Lowest price */
      low: number & Min<0>;
      /** Closing price */
      close: number & Min<0>;
      /** Trading volume */
      volume: number & Min<0>;
      /** Timestamp */
      timestamp?: number;
    }>;
  };
}

/**
 * Risk assessment request
 */
export interface RiskAssessmentRequest extends AIAnalysisRequest {
  analysisType: 'risk';
  data: {
    /** Trading symbol */
    symbol: string & MinLen<1>;
    /** Position side */
    side: 'long' | 'short';
    /** Position size */
    size: number & Min<0>;
    /** Entry price */
    entryPrice: number & Min<0>;
    /** Current market price */
    currentPrice: number & Min<0>;
    /** Market data context */
    marketData: {
      /** Market volatility */
      volatility: number & Min<0>;
      /** 24h trading volume */
      volume24h: number & Min<0>;
      /** Liquidity indicators */
      liquidity?: {
        /** Bid-ask spread */
        bidAskSpread: number & Min<0>;
        /** Market depth */
        marketDepth: number & Min<0>;
      };
    };
  };
}

/**
 * Streaming analysis request
 */
export interface StreamingAnalysisRequest extends AIAnalysisRequest {
  enableStreaming: true;
  /** Callback URL for streaming updates */
  callbackUrl?: string;
  /** Update frequency in milliseconds */
  updateIntervalMs?: number & Min<100> & Max<10000>;
}

// =============================================================================
// Supporting Types and Enums
// =============================================================================

/**
 * Available analysis types
 */
export type AnalysisType =
  | 'sentiment'
  | 'technical'
  | 'risk'
  | 'optimization'
  | 'trend'
  | 'correlation'
  | 'anomaly'
  | 'forecast';

/**
 * Analysis parameters for customizing AI behavior
 */
export interface AnalysisParameters {
  /** AI model temperature (0-2) */
  temperature?: number & Min<0> & Max<2>;
  /** Maximum tokens for response */
  maxTokens?: number & Min<1> & Max<32768>;
  /** Analysis depth level */
  depth?: 'basic' | 'detailed' | 'comprehensive';
  /** Include confidence intervals */
  includeConfidenceIntervals?: boolean;
  /** Historical context window in hours */
  contextWindowHours?: number & Min<1> & Max<168>;
}

/**
 * Token usage statistics from AI model
 */
export interface TokenUsage {
  /** Tokens used in the prompt */
  promptTokens: number;
  /** Tokens generated in completion */
  completionTokens: number;
  /** Total tokens used */
  totalTokens: number;
  /** Estimated cost in USD */
  estimatedCostUSD?: number;
}

/**
 * Cache information for analysis results
 */
export interface CacheInfo {
  /** Whether result was served from cache */
  fromCache: boolean;
  /** Cache key used */
  cacheKey?: string;
  /** Cache expiration timestamp */
  expiresAt?: number;
  /** Cache hit rate */
  hitRate?: number & Min<0> & Max<1>;
}

/**
 * Analysis context and metadata
 */
export interface AnalysisContext {
  /** Market conditions during analysis */
  marketConditions?: {
    /** Market session (US, Asian, European) */
    session: 'us' | 'asian' | 'european' | 'overlap';
    /** Overall market sentiment */
    overallSentiment: 'bullish' | 'bearish' | 'neutral';
    /** Volatility index */
    volatilityIndex: number & Min<0> & Max<100>;
  };
  /** User context if available */
  userContext?: {
    /** User risk tolerance */
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    /** User experience level */
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    /** Preferred analysis style */
    analysisStyle: 'technical' | 'fundamental' | 'quantitative' | 'mixed';
  };
}

// =============================================================================
// Budget and Resource Management
// =============================================================================

/**
 * AI budget tracking and limits
 */
export interface AIBudgetStatus {
  /** Tokens used in current period */
  tokensUsed: number;
  /** Tokens remaining in budget */
  tokensRemaining: number;
  /** Current cost in USD */
  costUSD: number;
  /** Number of requests made */
  requestCount: number;
  /** Budget period start time */
  periodStart: number;
  /** Budget period end time */
  periodEnd: number;
  /** Budget limit in USD */
  budgetLimitUSD: number;
}

/**
 * Cache statistics and performance metrics
 */
export interface AICacheStats {
  /** Cache hits */
  hits: number;
  /** Cache misses */
  misses: number;
  /** Hit rate (0-1) */
  hitRate: number & Min<0> & Max<1>;
  /** Total cached entries */
  totalEntries: number;
  /** Memory usage in bytes */
  memoryUsageBytes?: number;
  /** Average response time from cache */
  avgCacheResponseTimeMs?: number;
}

// =============================================================================
// Error and Validation Types
// =============================================================================

/**
 * AI-specific error types
 */
export interface AIError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Error category */
  category: AIErrorCategory;
  /** Suggested retry strategy */
  retryStrategy?: RetryStrategy;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * AI error categories
 */
export type AIErrorCategory =
  | 'validation'
  | 'rate_limit'
  | 'quota_exceeded'
  | 'model_error'
  | 'timeout'
  | 'network'
  | 'authentication'
  | 'insufficient_data'
  | 'internal_error';

/**
 * Retry strategy for failed requests
 */
export interface RetryStrategy {
  /** Should retry the request */
  shouldRetry: boolean;
  /** Delay before retry in milliseconds */
  retryDelayMs: number;
  /** Maximum number of retries */
  maxRetries: number;
  /** Backoff strategy */
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
}

// =============================================================================
// Type Guards and Predicates
// =============================================================================

/**
 * Type guard to check if a value is a valid AIAnalysisResult
 */
export function isAIAnalysisResult(value: unknown): value is AIAnalysisResult {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.success === 'boolean';
}

/**
 * Type guard to check if a value is a SentimentAnalysisResult
 */
export function isSentimentAnalysisResult(value: unknown): value is SentimentAnalysisResult {
  if (!isAIAnalysisResult(value)) return false;
  const obj = value as SentimentAnalysisResult;
  return (
    obj.data &&
    typeof obj.data === 'object' &&
    'sentiment' in obj.data &&
    ['bullish', 'bearish', 'neutral'].includes((obj.data as any).sentiment)
  );
}

/**
 * Type guard to check if a value is a TechnicalAnalysisResult
 */
export function isTechnicalAnalysisResult(value: unknown): value is TechnicalAnalysisResult {
  if (!isAIAnalysisResult(value)) return false;
  const obj = value as TechnicalAnalysisResult;
  return (
    obj.data &&
    typeof obj.data === 'object' &&
    'priceAction' in obj.data &&
    'support' in obj.data &&
    'resistance' in obj.data
  );
}

/**
 * Type guard to check if a value is a RiskAssessment
 */
export function isRiskAssessment(value: unknown): value is RiskAssessment {
  if (!isAIAnalysisResult(value)) return false;
  const obj = value as RiskAssessment;
  return (
    obj.data &&
    typeof obj.data === 'object' &&
    'riskLevel' in obj.data &&
    ['low', 'medium', 'high'].includes((obj.data as any).riskLevel)
  );
}

/**
 * Type guard to check if a value is a StreamingAnalysisUpdate
 */
export function isStreamingAnalysisUpdate(value: unknown): value is StreamingAnalysisUpdate {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.sequence === 'number' &&
    typeof obj.isFinal === 'boolean' &&
    typeof obj.progress === 'number' &&
    typeof obj.stage === 'string'
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a cache key for analysis requests
 */
export function createAnalysisCacheKey(
  analysisType: AnalysisType,
  data: unknown,
  parameters?: AnalysisParameters
): string {
  const normalized = JSON.stringify(
    { analysisType, data, parameters },
    Object.keys({ analysisType, data, parameters }).sort()
  );
  return Buffer.from(normalized).toString('base64');
}

/**
 * Validate analysis confidence score
 */
export function isValidConfidence(confidence: number): confidence is number & Min<0> & Max<1> {
  return typeof confidence === 'number' && confidence >= 0 && confidence <= 1;
}

/**
 * Validate token usage object
 */
export function isValidTokenUsage(usage: unknown): usage is TokenUsage {
  if (typeof usage !== 'object' || usage === null) return false;
  const obj = usage as Record<string, unknown>;
  return (
    typeof obj.promptTokens === 'number' &&
    typeof obj.completionTokens === 'number' &&
    typeof obj.totalTokens === 'number' &&
    obj.promptTokens >= 0 &&
    obj.completionTokens >= 0 &&
    obj.totalTokens >= 0
  );
}

/**
 * Calculate analysis cost based on token usage
 */
export function calculateAnalysisCost(usage: TokenUsage, costPerMillionTokens = 0.00075): number {
  return (usage.totalTokens / 1_000_000) * costPerMillionTokens;
}

/**
 * Merge partial analysis results
 */
export function mergeAnalysisResults<T extends AIAnalysisResult>(
  existing: Partial<T>,
  update: Partial<T>
): Partial<T> {
  const existingData =
    existing.data && typeof existing.data === 'object' ? (existing.data as object) : {};
  const updateData = update.data && typeof update.data === 'object' ? (update.data as object) : {};

  const existingMeta = (existing as any).metadata || {};
  const updateMeta = (update as any).metadata || {};

  return {
    ...existing,
    ...update,
    data: { ...existingData, ...updateData },
    metadata: { ...existingMeta, ...updateMeta },
  } as Partial<T>;
}
