/**
 * MCP Service for Encore.ts
 * Provides AI-enhanced Model Context Protocol functionality
 * Integrates with MEXC trading capabilities and AI analysis
 */

import { Service } from 'encore.dev/service';
import { geminiAnalyzer } from '../ai/gemini-analyzer';
import { geminiClient } from '../ai/gemini-client';
import { config } from '../shared/config';
import {
  type AIRecoveryOption,
  createAIAnalysisError,
  getFallbackAnalysisResult,
  handleAIError,
  retryWithBackoff,
} from '../shared/errors';
import type {
  AIAnalysisResult,
  AnalysisParameters,
  AnalysisType,
  RiskAssessment,
  SentimentAnalysisResult,
  TechnicalAnalysisResult,
  TokenUsage,
} from '../shared/types/ai-types';

export default new Service('mcp');

/**
 * Analysis depth configuration
 */
export interface AnalysisDepthConfig {
  /** Analysis depth level */
  depth: 'quick' | 'standard' | 'comprehensive' | 'deep';
  /** Model temperature for this depth */
  temperature: number;
  /** Maximum tokens for this depth */
  maxTokens: number;
  /** Context window hours for this depth */
  contextHours: number;
  /** Whether to include confidence intervals */
  includeConfidenceIntervals: boolean;
  /** Whether to enable parallel processing */
  enableParallelProcessing: boolean;
}

/**
 * Get analysis configuration based on depth level
 */
function getAnalysisDepthConfig(depth: string): AnalysisDepthConfig {
  const depthConfigs: Record<string, AnalysisDepthConfig> = {
    quick: {
      depth: 'quick',
      temperature: 0.3,
      maxTokens: 2048,
      contextHours: 6,
      includeConfidenceIntervals: false,
      enableParallelProcessing: false,
    },
    standard: {
      depth: 'standard',
      temperature: 0.5,
      maxTokens: 4096,
      contextHours: 12,
      includeConfidenceIntervals: true,
      enableParallelProcessing: false,
    },
    comprehensive: {
      depth: 'comprehensive',
      temperature: 0.7,
      maxTokens: 6144,
      contextHours: 24,
      includeConfidenceIntervals: true,
      enableParallelProcessing: true,
    },
    deep: {
      depth: 'deep',
      temperature: 0.9,
      maxTokens: 8192,
      contextHours: 48,
      includeConfidenceIntervals: true,
      enableParallelProcessing: true,
    },
  };

  return depthConfigs[depth] || depthConfigs.standard;
}

/**
 * Validate confidence score meets minimum threshold
 */
function validateConfidence(confidence: number, minThreshold = 0.7): boolean {
  return confidence >= minThreshold;
}

/**
 * Enhanced AI market analysis with depth levels and confidence validation
 */
export const mcpService = {
  /**
   * Perform comprehensive market analysis with specified depth
   */
  async performMarketAnalysis(
    data: {
      symbol: string;
      price?: number;
      volume?: number;
      marketData?: unknown;
      ohlcv?: unknown[];
    },
    analysisType: AnalysisType,
    depth: 'quick' | 'standard' | 'comprehensive' | 'deep' = 'standard',
    parameters?: AnalysisParameters
  ): Promise<AIAnalysisResult> {
    try {
      const depthConfig = getAnalysisDepthConfig(depth);
      const startTime = Date.now();

      // Validate input data
      if (!data.symbol || typeof data.symbol !== 'string' || data.symbol.trim() === '') {
        throw createAIAnalysisError(
          'Invalid input: symbol is required and must be a non-empty string',
          analysisType,
          {
            severity: 'error',
            recoverable: false,
            inputDataRef: `${data.symbol}-${Date.now()}`,
          }
        );
      }

      // Prepare analysis parameters with depth-specific configuration
      const analysisParams: AnalysisParameters = {
        temperature: parameters?.temperature ?? depthConfig.temperature,
        maxTokens: parameters?.maxTokens ?? depthConfig.maxTokens,
        depth: depthConfig.depth,
        includeConfidenceIntervals:
          parameters?.includeConfidenceIntervals ?? depthConfig.includeConfidenceIntervals,
        contextWindowHours: parameters?.contextWindowHours ?? depthConfig.contextHours,
      };

      // Configure analyzer for this depth level
      geminiAnalyzer.updateConfig({
        temperature: analysisParams.temperature,
        maxTokensPerRequest: analysisParams.maxTokens,
        cacheTTLMinutes: depth === 'quick' ? 5 : depth === 'standard' ? 15 : 30,
      });

      let result: AIAnalysisResult;

      // Perform analysis with retry logic
      const analysisOperation = async () => {
        switch (analysisType) {
          case 'sentiment':
            return await geminiAnalyzer.analyzeSentiment(data);
          case 'technical':
            if (!data.ohlcv && !data.marketData) {
              throw createAIAnalysisError(
                'Technical analysis requires OHLCV data or market data',
                analysisType,
                { severity: 'error', recoverable: false }
              );
            }
            return await geminiAnalyzer.performTechnicalAnalysis(data.marketData || data);
          case 'risk':
            return await geminiAnalyzer.assessRisk(data);
          case 'trend':
            if (!data.ohlcv) {
              throw createAIAnalysisError(
                'Trend analysis requires OHLCV historical data',
                analysisType,
                { severity: 'error', recoverable: false }
              );
            }
            return await geminiAnalyzer.analyzeTrend({
              symbol: data.symbol,
              dataPoints: data.ohlcv,
            });
          default:
            throw createAIAnalysisError(
              `Unsupported analysis type: ${analysisType}`,
              analysisType,
              { severity: 'error', recoverable: false }
            );
        }
      };

      // Perform analysis with retry logic
      result = await retryWithBackoff(analysisOperation, {
        shouldRetry: true,
        maxRetries: depth === 'quick' ? 1 : depth === 'deep' ? 5 : 3,
        retryDelayMs: depth === 'quick' ? 500 : 1000,
        backoffStrategy: 'exponential',
      });

      // Validate confidence if analysis succeeded
      if (result.success && result.confidence !== undefined) {
        const minConfidence = config.ai.risk.minConfidenceThreshold;
        if (!validateConfidence(result.confidence, minConfidence)) {
          console.warn(
            `⚠️  Low confidence analysis: ${result.confidence.toFixed(3)} < ${minConfidence.toFixed(3)}`
          );

          // For deep analysis, retry with higher temperature
          if (depth === 'deep' && result.confidence < 0.5) {
            console.log('🔄 Retrying deep analysis with higher temperature...');
            geminiAnalyzer.updateConfig({
              temperature: Math.min(1.5, analysisParams.temperature! + 0.3),
            });
            result = await analysisOperation();
          }
        }
      }

      // Add processing time and metadata
      const processingTimeMs = Date.now() - startTime;
      const enhancedResult: AIAnalysisResult = {
        ...result,
        timestamp: startTime,
        processingTimeMs,
        modelVersion: 'gemini-2.5-flash-preview-05-20',
      };

      return enhancedResult;
    } catch (error) {
      // Handle errors with fallback mechanisms
      return handleAIError(
        error as Error,
        analysisType,
        getFallbackAnalysisResult(analysisType, data, error as Error)
      );
    }
  },

  /**
   * Perform multiple analysis types in parallel (for comprehensive/deep depths)
   */
  async performMultiAnalysis(
    data: {
      symbol: string;
      price?: number;
      volume?: number;
      marketData?: unknown;
      ohlcv?: unknown[];
    },
    analysisTypes: AnalysisType[],
    depth: 'comprehensive' | 'deep' = 'comprehensive'
  ): Promise<Record<AnalysisType, AIAnalysisResult>> {
    const depthConfig = getAnalysisDepthConfig(depth);

    if (!depthConfig.enableParallelProcessing) {
      // Sequential processing for non-parallel depths
      const results: Record<AnalysisType, AIAnalysisResult> = {} as any;
      for (const analysisType of analysisTypes) {
        results[analysisType] = await this.performMarketAnalysis(data, analysisType, depth);
      }
      return results;
    }

    // Parallel processing for comprehensive/deep analysis
    const analysisPromises = analysisTypes.map(async (analysisType) => {
      const result = await this.performMarketAnalysis(data, analysisType, depth);
      return { analysisType, result };
    });

    const resolvedAnalyses = await Promise.allSettled(analysisPromises);
    const results: Record<AnalysisType, AIAnalysisResult> = {} as any;

    resolvedAnalyses.forEach((settledResult, index) => {
      const analysisType = analysisTypes[index];
      if (settledResult.status === 'fulfilled') {
        results[analysisType] = settledResult.value.result;
      } else {
        results[analysisType] = {
          success: false,
          error: `Multi-analysis failed for ${analysisType}: ${settledResult.reason}`,
          timestamp: Date.now(),
          processingTimeMs: 0,
        };
      }
    });

    return results;
  },

  /**
   * Get service health and performance metrics
   */
  getServiceHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    budgetStatus: unknown;
    cacheStats: unknown;
    configuration: unknown;
  } {
    try {
      const budgetStatus = geminiAnalyzer.getBudgetStatus();
      const cacheStats = geminiAnalyzer.getCacheStats();
      const configuration = geminiAnalyzer.getConfig();

      // Determine health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (budgetStatus.costUSD > config.ai.budget.maxCostPerDay * 0.9) {
        status = 'degraded';
      }

      if (budgetStatus.costUSD >= config.ai.budget.maxCostPerDay) {
        status = 'unhealthy';
      }

      return {
        status,
        budgetStatus,
        cacheStats,
        configuration,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        budgetStatus: null,
        cacheStats: null,
        configuration: null,
      };
    }
  },

  /**
   * Reset analysis budget and cache (admin function)
   */
  resetAnalysisEnvironment(): { success: boolean; message: string } {
    try {
      geminiAnalyzer.resetBudgetWindow();
      geminiAnalyzer.clearCache();
      return {
        success: true,
        message: 'Analysis environment reset successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to reset environment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },

  /**
   * Perform comprehensive portfolio risk assessment
   */
  async performRiskAssessment(
    data: {
      portfolio: Array<{
        symbol: string;
        quantity: number;
        currentPrice: number;
        entryPrice?: number;
        assetType?: 'crypto' | 'stock' | 'commodity' | 'forex';
      }>;
      totalValue: number;
      riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
      timeHorizon?: 'short' | 'medium' | 'long';
      marketContext?: {
        marketSentiment?: 'bullish' | 'bearish' | 'neutral';
        volatilityIndex?: number;
        economicIndicators?: {
          inflationRate?: number;
          interestRates?: number;
          unemploymentRate?: number;
        };
      };
    },
    analysisDepth: 'quick' | 'standard' | 'comprehensive' | 'deep' = 'standard'
  ): Promise<{
    success: boolean;
    overallRiskLevel?: 'low' | 'medium' | 'high' | 'extreme';
    riskScore?: number;
    confidence?: number;
    diversificationScore?: number;
    volatility?: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    riskFactors?: Array<{
      factor: string;
      impact: 'low' | 'medium' | 'high';
      description: string;
    }>;
    assetAllocation?: Array<{
      symbol: string;
      percentage: number;
      riskLevel: 'low' | 'medium' | 'high';
      riskContribution: number;
    }>;
    recommendations?: Array<{
      type: 'reduce_position' | 'diversify' | 'hedge' | 'rebalance' | 'hold' | 'exit';
      target?: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
    }>;
    stressTests?: Array<{
      scenario: string;
      potentialLoss: number;
      probability: number;
    }>;
    error?: string;
    modelVersion?: string;
    tokenUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCostUSD?: number;
    };
  }> {
    try {
      const startTime = Date.now();
      const depthConfig = getAnalysisDepthConfig(analysisDepth);

      // Configure analyzer for this depth level
      geminiAnalyzer.updateConfig({
        temperature: depthConfig.temperature,
        maxTokensPerRequest: depthConfig.maxTokens,
        cacheTTLMinutes: analysisDepth === 'quick' ? 3 : analysisDepth === 'standard' ? 10 : 20,
      });

      // Prepare portfolio analysis data
      const portfolioAnalysisData = {
        portfolio: data.portfolio,
        totalValue: data.totalValue,
        riskTolerance: data.riskTolerance || 'moderate',
        timeHorizon: data.timeHorizon || 'medium',
        marketContext: data.marketContext,
        analysisDepth,
      };

      // Use the AI analyzer for risk assessment
      const result = await retryWithBackoff(
        async () => {
          return await this.performAdvancedRiskAnalysis(portfolioAnalysisData, depthConfig);
        },
        {
          shouldRetry: true,
          maxRetries: analysisDepth === 'quick' ? 1 : analysisDepth === 'deep' ? 5 : 3,
          retryDelayMs: analysisDepth === 'quick' ? 500 : 1000,
          backoffStrategy: 'exponential',
        }
      );

      // Add metadata
      const enhancedResult = {
        ...result,
        modelVersion: 'gemini-2.5-flash-preview-05-20',
      };

      return enhancedResult;
    } catch (error) {
      return handleAIError(error as Error, 'risk', {
        success: false,
        error: 'Risk assessment failed',
        overallRiskLevel: 'high', // Conservative fallback
        riskScore: 75,
        confidence: 0,
        diversificationScore: 0,
        volatility: { daily: 0, weekly: 0, monthly: 0 },
        riskFactors: [
          {
            factor: 'Analysis Unavailable',
            impact: 'high',
            description: 'Unable to perform comprehensive risk analysis due to system error',
          },
        ],
        assetAllocation: [],
        recommendations: [
          {
            type: 'hold',
            description: 'Manual risk assessment recommended due to analysis failure',
            priority: 'high',
          },
        ],
        timestamp: Date.now(),
        processingTimeMs: 0,
      });
    }
  },

  /**
   * Perform advanced risk analysis using Vercel AI SDK
   */
  async performAdvancedRiskAnalysis(
    data: {
      portfolio: Array<{
        symbol: string;
        quantity: number;
        currentPrice: number;
        entryPrice?: number;
        assetType?: string;
      }>;
      totalValue: number;
      riskTolerance: string;
      timeHorizon: string;
      marketContext?: unknown;
      analysisDepth: string;
    },
    depthConfig: AnalysisDepthConfig
  ): Promise<{
    success: boolean;
    overallRiskLevel?: 'low' | 'medium' | 'high' | 'extreme';
    riskScore?: number;
    confidence?: number;
    diversificationScore?: number;
    volatility?: { daily: number; weekly: number; monthly: number };
    riskFactors?: Array<{ factor: string; impact: 'low' | 'medium' | 'high'; description: string }>;
    assetAllocation?: Array<{
      symbol: string;
      percentage: number;
      riskLevel: 'low' | 'medium' | 'high';
      riskContribution: number;
    }>;
    recommendations?: Array<{
      type: string;
      target?: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
    }>;
    stressTests?: Array<{ scenario: string; potentialLoss: number; probability: number }>;
    error?: string;
    tokenUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCostUSD?: number;
    };
  }> {
    // Calculate basic portfolio metrics
    const portfolioSize = data.portfolio.length;
    const assetValues = data.portfolio.map((asset) => asset.quantity * asset.currentPrice);
    const percentages = assetValues.map((value) => (value / data.totalValue) * 100);

    // Calculate concentration and diversification
    const maxAllocation = Math.max(...percentages);
    const diversificationScore = Math.min(1, portfolioSize / 10);

    // Build comprehensive prompt for AI analysis
    const prompt = `Perform a comprehensive portfolio risk assessment for the following portfolio:

Portfolio Overview:
- Total Value: $${data.totalValue.toFixed(2)}
- Number of Assets: ${portfolioSize}
- Risk Tolerance: ${data.riskTolerance}
- Time Horizon: ${data.timeHorizon}
- Analysis Depth: ${data.analysisDepth}

Asset Breakdown:
${data.portfolio
  .map(
    (asset, i) =>
      `${i + 1}. ${asset.symbol}: ${asset.quantity} units @ $${asset.currentPrice} = $${assetValues[i].toFixed(2)} (${percentages[i].toFixed(1)}%)${asset.entryPrice ? ` [Entry: $${asset.entryPrice}]` : ''}`
  )
  .join('\n')}

${
  data.marketContext
    ? `Market Context:
${JSON.stringify(data.marketContext, null, 2)}\n`
    : ''
}
Please provide a detailed risk assessment including:
1. Overall risk level (low/medium/high/extreme)
2. Risk score (0-100)
3. Confidence in assessment (0-1)
4. Diversification analysis
5. Volatility estimates (daily/weekly/monthly %)
6. Key risk factors with impact levels
7. Asset allocation risk analysis
8. Specific recommendations with priorities
9. Stress test scenarios with potential losses

Focus on practical, actionable insights for a ${data.riskTolerance} investor with a ${data.timeHorizon}-term outlook.`;

    const schema = {
      type: 'object',
      properties: {
        overallRiskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'extreme'] },
        riskScore: { type: 'number', minimum: 0, maximum: 100 },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        diversificationScore: { type: 'number', minimum: 0, maximum: 1 },
        volatility: {
          type: 'object',
          properties: {
            daily: { type: 'number', minimum: 0 },
            weekly: { type: 'number', minimum: 0 },
            monthly: { type: 'number', minimum: 0 },
          },
          required: ['daily', 'weekly', 'monthly'],
        },
        riskFactors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              factor: { type: 'string' },
              impact: { type: 'string', enum: ['low', 'medium', 'high'] },
              description: { type: 'string' },
            },
            required: ['factor', 'impact', 'description'],
          },
        },
        assetAllocation: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              symbol: { type: 'string' },
              percentage: { type: 'number', minimum: 0, maximum: 100 },
              riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
              riskContribution: { type: 'number', minimum: 0, maximum: 100 },
            },
            required: ['symbol', 'percentage', 'riskLevel', 'riskContribution'],
          },
        },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['reduce_position', 'diversify', 'hedge', 'rebalance', 'hold', 'exit'],
              },
              target: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            },
            required: ['type', 'description', 'priority'],
          },
        },
        stressTests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              scenario: { type: 'string' },
              potentialLoss: { type: 'number', minimum: 0, maximum: 100 },
              probability: { type: 'number', minimum: 0, maximum: 1 },
            },
            required: ['scenario', 'potentialLoss', 'probability'],
          },
        },
      },
      required: [
        'overallRiskLevel',
        'riskScore',
        'confidence',
        'diversificationScore',
        'volatility',
        'riskFactors',
        'assetAllocation',
        'recommendations',
      ],
    };

    try {
      const result = await geminiClient.generateObject(prompt, schema, 'Portfolio Risk Assessment');

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        ...result.data,
        tokenUsage: result.usage
          ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
              estimatedCostUSD: (result.usage.totalTokens / 1_000_000) * 0.00075, // Gemini 2.5 Flash pricing
            }
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Advanced risk analysis failed',
      };
    }
  },
};
