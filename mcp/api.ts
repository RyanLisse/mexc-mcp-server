/**
 * MCP API Endpoints
 * AI-enhanced Model Context Protocol endpoints for trading analysis
 */

import { api } from 'encore.dev/api';
import type { Max, Min, MinLen } from 'encore.dev/validate';
import { createErrorResponse, isAIOperationAllowed, logAndNotify } from '../shared/errors';
import type {
  AIAnalysisResult,
  AnalysisType,
  RiskAssessment,
  SentimentAnalysisResult,
  TechnicalAnalysisResult,
} from '../shared/types/ai-types';
import { mcpService } from './encore.service';

// =============================================================================
// Request/Response Interfaces
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

// =============================================================================
// API Endpoints
// =============================================================================

/**
 * AI Market Analysis Endpoint
 * Performs comprehensive market analysis with multiple depth levels
 */
export const aiMarketAnalysis = api(
  { method: 'POST', path: '/mcp/ai-market-analysis', expose: true },
  async ({
    symbol,
    analysisType,
    depth = 'standard',
    price,
    volume,
    ohlcv,
    marketData,
    parameters,
  }: AIMarketAnalysisRequest): Promise<AnalysisResponse> => {
    const startTime = Date.now();

    try {
      // Validate risk level for this operation
      const riskLevel = depth === 'quick' ? 'low' : depth === 'deep' ? 'high' : 'medium';
      if (!isAIOperationAllowed(riskLevel)) {
        return {
          success: false,
          error: `AI operation not allowed for risk level: ${riskLevel}`,
          metadata: {
            analysisType,
            depth,
            processingTimeMs: Date.now() - startTime,
            timestamp: startTime,
            confidenceValidated: false,
          },
        };
      }

      // Prepare data for analysis
      const analysisData = {
        symbol: symbol.toUpperCase().trim(),
        price,
        volume,
        ohlcv,
        marketData,
      };

      // Perform analysis
      const result = await mcpService.performMarketAnalysis(
        analysisData,
        analysisType,
        depth,
        parameters
      );

      // Check confidence validation
      const confidenceValidated = result.confidence !== undefined && result.confidence >= 0.7;

      if (!confidenceValidated && result.success) {
        logAndNotify(new Error(`Low confidence analysis result: ${result.confidence}`), {
          symbol,
          analysisType,
          depth,
          confidence: result.confidence,
        });
      }

      return {
        success: result.success,
        data: result,
        error: result.error,
        metadata: {
          analysisType,
          depth,
          processingTimeMs: Date.now() - startTime,
          timestamp: startTime,
          modelVersion: result.modelVersion,
          confidenceValidated,
        },
      };
    } catch (error) {
      const errorResponse = createErrorResponse(error as Error);
      return {
        success: false,
        error: errorResponse.error.message,
        metadata: {
          analysisType,
          depth,
          processingTimeMs: Date.now() - startTime,
          timestamp: startTime,
          confidenceValidated: false,
        },
      };
    }
  }
);

/**
 * Multi-Analysis Endpoint
 * Performs multiple analysis types in parallel for comprehensive insights
 */
export const multiAnalysis = api(
  { method: 'POST', path: '/mcp/multi-analysis', expose: true },
  async ({
    symbol,
    analysisTypes,
    depth = 'comprehensive',
    price,
    volume,
    ohlcv,
    marketData,
  }: MultiAnalysisRequest): Promise<MultiAnalysisResponse> => {
    const startTime = Date.now();

    try {
      // Validate that we have valid analysis types
      if (!analysisTypes || analysisTypes.length === 0) {
        return {
          success: false,
          error: 'At least one analysis type must be specified',
          metadata: {
            depth,
            totalProcessingTimeMs: Date.now() - startTime,
            timestamp: startTime,
            analysisTypes: [],
            successfulAnalyses: 0,
            failedAnalyses: 0,
          },
        };
      }

      // Validate risk level for multi-analysis
      const riskLevel = depth === 'deep' ? 'high' : 'medium';
      if (!isAIOperationAllowed(riskLevel)) {
        return {
          success: false,
          error: `Multi-analysis not allowed for risk level: ${riskLevel}`,
          metadata: {
            depth,
            totalProcessingTimeMs: Date.now() - startTime,
            timestamp: startTime,
            analysisTypes,
            successfulAnalyses: 0,
            failedAnalyses: analysisTypes.length,
          },
        };
      }

      // Prepare data for analysis
      const analysisData = {
        symbol: symbol.toUpperCase().trim(),
        price,
        volume,
        ohlcv,
        marketData,
      };

      // Perform multi-analysis
      const results = await mcpService.performMultiAnalysis(analysisData, analysisTypes, depth);

      // Count successful/failed analyses
      let successfulAnalyses = 0;
      let failedAnalyses = 0;

      Object.values(results).forEach((result) => {
        if (result.success) {
          successfulAnalyses++;
        } else {
          failedAnalyses++;
        }
      });

      const overallSuccess = successfulAnalyses > 0;

      return {
        success: overallSuccess,
        data: results,
        error: !overallSuccess ? 'All analyses failed' : undefined,
        metadata: {
          depth,
          totalProcessingTimeMs: Date.now() - startTime,
          timestamp: startTime,
          analysisTypes,
          successfulAnalyses,
          failedAnalyses,
        },
      };
    } catch (error) {
      const errorResponse = createErrorResponse(error as Error);
      return {
        success: false,
        error: errorResponse.error.message,
        metadata: {
          depth,
          totalProcessingTimeMs: Date.now() - startTime,
          timestamp: startTime,
          analysisTypes,
          successfulAnalyses: 0,
          failedAnalyses: analysisTypes.length,
        },
      };
    }
  }
);

/**
 * Service Health Check Endpoint
 * Provides health status and performance metrics
 */
export const getServiceHealth = api(
  { method: 'GET', path: '/mcp/health', expose: true },
  async (): Promise<ServiceHealthResponse> => {
    try {
      const health = mcpService.getServiceHealth();
      return health;
    } catch (error) {
      return {
        status: 'unhealthy',
        budgetStatus: undefined,
        cacheStats: undefined,
        configuration: undefined,
      };
    }
  }
);

/**
 * Reset Analysis Environment Endpoint (Admin)
 * Resets budget and cache for fresh analysis environment
 */
export const resetAnalysisEnvironment = api(
  { method: 'POST', path: '/mcp/reset-environment', expose: true },
  async (): Promise<{ success: boolean; message: string }> => {
    try {
      return mcpService.resetAnalysisEnvironment();
    } catch (error) {
      return {
        success: false,
        message: `Failed to reset environment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

/**
 * Quick Risk Score Calculator Endpoint
 * Provides fast risk estimation without AI analysis
 */
export const quickRiskScore = api(
  { method: 'POST', path: '/mcp/quick-risk-score', expose: true },
  async ({
    portfolio,
    totalValue,
  }: {
    portfolio: Array<{
      symbol: string & MinLen<1>;
      quantity: number & Min<0>;
      currentPrice: number & Min<0>;
      entryPrice?: number & Min<0>;
    }>;
    totalValue: number & Min<0>;
  }): Promise<{
    success: boolean;
    data?: {
      riskScore: number;
      riskLevel: 'low' | 'medium' | 'high' | 'extreme';
      diversificationScore: number;
      topRisks: string[];
    };
    error?: string;
  }> => {
    try {
      if (!portfolio || portfolio.length === 0) {
        return {
          success: false,
          error: 'Portfolio must contain at least one asset',
        };
      }

      // Calculate basic risk metrics without AI
      const portfolioSize = portfolio.length;
      const diversificationScore = Math.min(1, portfolioSize / 10); // Simple diversification metric

      // Calculate concentration risk
      const assetValues = portfolio.map((asset) => asset.quantity * asset.currentPrice);
      const maxAllocation = Math.max(...assetValues) / totalValue;
      const concentrationRisk =
        maxAllocation > 0.5 ? 'high' : maxAllocation > 0.3 ? 'medium' : 'low';

      // Calculate volatility risk based on price changes
      let volatilityRisk = 0;
      portfolio.forEach((asset) => {
        if (asset.entryPrice) {
          const priceChange = Math.abs(asset.currentPrice - asset.entryPrice) / asset.entryPrice;
          volatilityRisk += priceChange;
        }
      });
      volatilityRisk = volatilityRisk / portfolio.length; // Average volatility

      // Calculate overall risk score (0-100)
      let riskScore = 50; // Base score

      // Adjust for concentration
      if (concentrationRisk === 'high') riskScore += 30;
      else if (concentrationRisk === 'medium') riskScore += 15;

      // Adjust for diversification
      riskScore -= diversificationScore * 20;

      // Adjust for volatility
      riskScore += volatilityRisk * 50;

      // Clamp to 0-100
      riskScore = Math.max(0, Math.min(100, riskScore));

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'extreme';
      if (riskScore < 25) riskLevel = 'low';
      else if (riskScore < 50) riskLevel = 'medium';
      else if (riskScore < 75) riskLevel = 'high';
      else riskLevel = 'extreme';

      // Generate top risks
      const topRisks: string[] = [];
      if (concentrationRisk === 'high') {
        topRisks.push('High concentration in single asset');
      }
      if (portfolioSize < 5) {
        topRisks.push('Insufficient diversification');
      }
      if (volatilityRisk > 0.3) {
        topRisks.push('High price volatility detected');
      }
      if (totalValue < 1000) {
        topRisks.push('Small portfolio size increases relative risk');
      }

      return {
        success: true,
        data: {
          riskScore,
          riskLevel,
          diversificationScore,
          topRisks,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Quick risk calculation failed',
      };
    }
  }
);

/**
 * Get Analysis Depth Configuration
 * Returns available analysis depths and their configurations
 */
export const getAnalysisDepths = api(
  { method: 'GET', path: '/mcp/analysis-depths', expose: true },
  async (): Promise<{
    depths: Record<
      string,
      {
        name: string;
        description: string;
        temperature: number;
        maxTokens: number;
        contextHours: number;
        features: string[];
      }
    >;
  }> => {
    return {
      depths: {
        quick: {
          name: 'Quick Analysis',
          description: 'Fast analysis with basic insights, minimal token usage',
          temperature: 0.3,
          maxTokens: 2048,
          contextHours: 6,
          features: ['Basic sentiment', 'Quick recommendations', 'Low latency'],
        },
        standard: {
          name: 'Standard Analysis',
          description: 'Balanced analysis with good accuracy and reasonable speed',
          temperature: 0.5,
          maxTokens: 4096,
          contextHours: 12,
          features: ['Detailed sentiment', 'Confidence intervals', 'Market context'],
        },
        comprehensive: {
          name: 'Comprehensive Analysis',
          description: 'Thorough analysis with high accuracy and detailed insights',
          temperature: 0.7,
          maxTokens: 6144,
          contextHours: 24,
          features: [
            'Multi-factor analysis',
            'Risk assessment',
            'Parallel processing',
            'Extended context',
          ],
        },
        deep: {
          name: 'Deep Analysis',
          description: 'Most thorough analysis with maximum context and accuracy',
          temperature: 0.9,
          maxTokens: 8192,
          contextHours: 48,
          features: [
            'Advanced AI reasoning',
            'Multiple retries',
            'Maximum context',
            'Confidence validation',
          ],
        },
      },
    };
  }
);

// =============================================================================
// Risk Assessment Endpoint
// =============================================================================

/**
 * Portfolio Risk Assessment Request with Encore.ts validation
 */
export interface PortfolioRiskAssessmentRequest {
  /** Portfolio holdings */
  portfolio: Array<{
    /** Asset symbol */
    symbol: string & MinLen<1>;
    /** Position quantity */
    quantity: number & Min<0>;
    /** Current price per unit */
    currentPrice: number & Min<0>;
    /** Entry price per unit */
    entryPrice?: number & Min<0>;
    /** Asset type */
    assetType?: 'crypto' | 'stock' | 'commodity' | 'forex';
  }>;
  /** Total portfolio value in USD */
  totalValue: number & Min<0>;
  /** Risk tolerance level */
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  /** Time horizon for risk assessment */
  timeHorizon?: 'short' | 'medium' | 'long';
  /** Additional market context */
  marketContext?: {
    /** Overall market sentiment */
    marketSentiment?: 'bullish' | 'bearish' | 'neutral';
    /** Volatility index (VIX-like) */
    volatilityIndex?: number & Min<0> & Max<100>;
    /** Economic indicators */
    economicIndicators?: {
      inflationRate?: number;
      interestRates?: number;
      unemploymentRate?: number;
    };
  };
  /** Analysis depth level */
  analysisDepth?: 'quick' | 'standard' | 'comprehensive' | 'deep';
}

/**
 * Enhanced Risk Assessment Response
 */
export interface RiskAssessmentResponse {
  /** Whether assessment succeeded */
  success: boolean;
  /** Risk assessment results */
  data?: {
    /** Overall portfolio risk level */
    overallRiskLevel: 'low' | 'medium' | 'high' | 'extreme';
    /** Risk score (0-100, higher = more risky) */
    riskScore: number;
    /** Confidence in assessment (0-1) */
    confidence: number;
    /** Portfolio diversification score (0-1) */
    diversificationScore: number;
    /** Volatility assessment */
    volatility: {
      /** Daily volatility percentage */
      daily: number;
      /** Weekly volatility percentage */
      weekly: number;
      /** Monthly volatility percentage */
      monthly: number;
    };
    /** Risk factors identified */
    riskFactors: Array<{
      /** Factor name */
      factor: string;
      /** Impact level */
      impact: 'low' | 'medium' | 'high';
      /** Description */
      description: string;
    }>;
    /** Asset allocation analysis */
    assetAllocation: Array<{
      /** Asset symbol */
      symbol: string;
      /** Percentage of portfolio */
      percentage: number;
      /** Individual risk level */
      riskLevel: 'low' | 'medium' | 'high';
      /** Contribution to portfolio risk */
      riskContribution: number;
    }>;
    /** Recommendations */
    recommendations: Array<{
      /** Recommendation type */
      type: 'reduce_position' | 'diversify' | 'hedge' | 'rebalance' | 'hold' | 'exit';
      /** Asset or action target */
      target?: string;
      /** Recommendation description */
      description: string;
      /** Priority level */
      priority: 'low' | 'medium' | 'high';
    }>;
    /** Stress test scenarios */
    stressTests?: Array<{
      /** Scenario name */
      scenario: string;
      /** Potential loss percentage */
      potentialLoss: number;
      /** Probability of occurrence */
      probability: number;
    }>;
  };
  /** Error message if failed */
  error?: string;
  /** Analysis metadata */
  metadata?: {
    analysisDepth: string;
    processingTimeMs: number;
    timestamp: number;
    modelVersion?: string;
    tokenUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCostUSD?: number;
    };
  };
}

/**
 * Intelligent Portfolio Risk Assessment Endpoint
 * Leverages Vercel AI SDK for comprehensive risk analysis
 */
export const portfolioRiskAssessment = api(
  { method: 'POST', path: '/mcp/risk-assessment', expose: true },
  async ({
    portfolio,
    totalValue,
    riskTolerance = 'moderate',
    timeHorizon = 'medium',
    marketContext,
    analysisDepth = 'standard',
  }: PortfolioRiskAssessmentRequest): Promise<RiskAssessmentResponse> => {
    const startTime = Date.now();

    try {
      // Validate input
      if (!portfolio || portfolio.length === 0) {
        return {
          success: false,
          error: 'Portfolio must contain at least one asset',
          metadata: {
            analysisDepth,
            processingTimeMs: Date.now() - startTime,
            timestamp: startTime,
          },
        };
      }

      if (totalValue <= 0) {
        return {
          success: false,
          error: 'Total portfolio value must be positive',
          metadata: {
            analysisDepth,
            processingTimeMs: Date.now() - startTime,
            timestamp: startTime,
          },
        };
      }

      // Check risk operation allowance
      const riskLevel =
        analysisDepth === 'quick' ? 'low' : analysisDepth === 'deep' ? 'high' : 'medium';
      if (!isAIOperationAllowed(riskLevel)) {
        return {
          success: false,
          error: `Risk assessment not allowed for risk level: ${riskLevel}`,
          metadata: {
            analysisDepth,
            processingTimeMs: Date.now() - startTime,
            timestamp: startTime,
          },
        };
      }

      // Perform risk assessment using the MCP service
      const result = await mcpService.performRiskAssessment(
        {
          portfolio,
          totalValue,
          riskTolerance,
          timeHorizon,
          marketContext,
        },
        analysisDepth
      );

      // Validate confidence
      const confidenceValidated = result.confidence !== undefined && result.confidence >= 0.7;

      if (!confidenceValidated && result.success) {
        logAndNotify(new Error(`Low confidence risk assessment: ${result.confidence}`), {
          portfolioSize: portfolio.length,
          totalValue,
          analysisDepth,
          confidence: result.confidence,
        });
      }

      return {
        success: result.success,
        data: result.success
          ? {
              overallRiskLevel: result.overallRiskLevel || 'medium',
              riskScore: result.riskScore || 50,
              confidence: result.confidence || 0,
              diversificationScore: result.diversificationScore || 0,
              volatility: result.volatility || {
                daily: 0,
                weekly: 0,
                monthly: 0,
              },
              riskFactors: result.riskFactors || [],
              assetAllocation: result.assetAllocation || [],
              recommendations: result.recommendations || [],
              stressTests: result.stressTests,
            }
          : undefined,
        error: result.error,
        metadata: {
          analysisDepth,
          processingTimeMs: Date.now() - startTime,
          timestamp: startTime,
          modelVersion: result.modelVersion,
          tokenUsage: result.tokenUsage,
        },
      };
    } catch (error) {
      const errorResponse = createErrorResponse(error as Error);
      return {
        success: false,
        error: errorResponse.error.message,
        metadata: {
          analysisDepth,
          processingTimeMs: Date.now() - startTime,
          timestamp: startTime,
        },
      };
    }
  }
);
