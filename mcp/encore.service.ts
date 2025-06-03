/**
 * MCP Service for Encore.ts (Refactored)
 * Core service with delegated functionality to maintain under 500 lines
 * Integrates with MEXC trading capabilities through dedicated service layers
 */

import { Service } from 'encore.dev/service';
import { z } from 'zod';
import type {
  AIAnalysisResult,
  AnalysisParameters,
  AnalysisType,
} from '../shared/types/ai-types';

// AI and Gemini imports
import { geminiAnalyzer } from '../ai/gemini-analyzer';
import { geminiClient } from '../ai/gemini-client';

// Error handling imports
import { handleAIError, retryWithBackoff } from '../shared/errors';

// Import dedicated service modules
import { mcpAnalysisService, type MarketAnalysisData } from './services/mcpAnalysis';
import { mcpCoreService, getAnalysisDepthConfig } from './services/mcpCore';
import { mcpRiskService, type PortfolioRiskData } from './services/mcpRisk';
import { mcpTradingToolsService, type TradingToolsAnalysisRequest } from './services/mcpTradingTools';

export default new Service('mcp');

// =============================================================================
// Re-export core types for backward compatibility
// =============================================================================

export type { AnalysisDepthConfig } from './services/mcpCore';
export type { MarketAnalysisData } from './services/mcpAnalysis';
export type { PortfolioRiskData } from './services/mcpRisk';
export type { TradingToolsAnalysisRequest } from './services/mcpTradingTools';

// =============================================================================
// Main MCP Service - Refactored with delegation pattern
// =============================================================================

/**
 * Enhanced AI market analysis service with distributed functionality
 */
export const mcpService = {
  /**
   * Perform comprehensive market analysis - delegates to mcpAnalysisService
   */
  async performMarketAnalysis(
    data: MarketAnalysisData,
    analysisType: AnalysisType,
    depth: 'quick' | 'standard' | 'comprehensive' | 'deep' = 'standard',
    parameters?: AnalysisParameters
  ): Promise<AIAnalysisResult> {
    return await mcpAnalysisService.performMarketAnalysis(data, analysisType, depth, parameters);
  },

  /**
   * Perform multiple analysis types - delegates to mcpAnalysisService
   */
  async performMultiAnalysis(
    data: MarketAnalysisData,
    analysisTypes: AnalysisType[],
    depth: 'comprehensive' | 'deep' = 'comprehensive',
    parameters?: AnalysisParameters
  ): Promise<Record<AnalysisType, AIAnalysisResult>> {
    return await mcpAnalysisService.performMultiAnalysis(data, analysisTypes, depth, parameters);
  },

  /**
   * Get service health and performance metrics - delegates to mcpCoreService
   */
  getServiceHealth() {
    return mcpCoreService.getServiceHealth();
  },

  /**
   * Reset analysis budget and cache - delegates to mcpCoreService
   */
  resetAnalysisEnvironment() {
    return mcpCoreService.resetAnalysisEnvironment();
  },

  /**
   * Perform comprehensive portfolio risk assessment - delegates to mcpRiskService
   */
  async performRiskAssessment(
    data: PortfolioRiskData,
    analysisDepth: 'quick' | 'standard' | 'comprehensive' | 'deep' = 'standard'
  ) {
    return await mcpRiskService.performRiskAssessment(data, analysisDepth);
  },


  /**
   * Perform strategy optimization using AI (Task #27)
   */
  async performStrategyOptimization(
    data: {
      portfolio: Array<{
        symbol: string;
        currentWeight: number;
        historicalReturns?: number[];
      }>;
      objectiveFunction: 'sharpe_ratio' | 'max_return' | 'min_risk' | 'min_drawdown' | 'custom';
      constraints: {
        maxRisk?: number;
        minReturn?: number;
        maxDrawdown?: number;
        maxPositionSize?: number;
        minPositionSize?: number;
      };
      timeHorizon?: 'short' | 'medium' | 'long';
      rebalanceFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
      mexcParameters?: {
        utilize0Fees?: boolean;
        considerLeverage?: boolean;
        maxLeverage?: number;
      };
    },
    analysisDepth: 'quick' | 'standard' | 'comprehensive' | 'deep' = 'standard'
  ): Promise<{
    success: boolean;
    optimizationType?: string;
    confidence?: number;
    optimizedMetrics?: {
      expectedReturn: number;
      volatility: number;
      sharpeRatio: number;
      maxDrawdown: number;
      informationRatio?: number;
    };
    allocations?: Array<{
      symbol: string;
      currentWeight: number;
      optimizedWeight: number;
      adjustment: number;
      reasoning: string;
    }>;
    mexcAdvantages?: {
      feeSavingsUSD?: number;
      leverageOpportunities?: Array<{
        symbol: string;
        recommendedLeverage: number;
        expectedBoost: number;
      }>;
    };
    backtestResults?: {
      periodMonths: number;
      totalReturn: number;
      annualizedReturn: number;
      maxDrawdown: number;
      winRate: number;
      vsBaseline: {
        baselineReturn: number;
        outperformance: number;
      };
    };
    recommendations?: Array<{
      type: 'allocation_change' | 'rebalance' | 'risk_reduction' | 'leverage_opportunity';
      priority: 'low' | 'medium' | 'high';
      description: string;
      expectedImpact?: string;
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

      // Configure analyzer for optimization depth
      geminiAnalyzer.updateConfig({
        temperature: depthConfig.temperature,
        maxTokensPerRequest: depthConfig.maxTokens,
        cacheTTLMinutes: analysisDepth === 'quick' ? 3 : analysisDepth === 'standard' ? 10 : 20,
      });

      // Calculate current portfolio metrics
      const totalWeight = data.portfolio.reduce((sum, asset) => sum + asset.currentWeight, 0);
      const portfolioSize = data.portfolio.length;

      // Build comprehensive prompt for strategy optimization
      const prompt = `Perform comprehensive portfolio optimization for the following parameters:

Optimization Objective: ${data.objectiveFunction}
Analysis Depth: ${analysisDepth}
Time Horizon: ${data.timeHorizon || 'medium'}
Rebalance Frequency: ${data.rebalanceFrequency || 'monthly'}

Current Portfolio:
${data.portfolio
  .map(
    (asset, i) =>
      `${i + 1}. ${asset.symbol}: ${(asset.currentWeight * 100).toFixed(1)}% allocation${
        asset.historicalReturns ? ` [${asset.historicalReturns.length} historical data points]` : ''
      }`
  )
  .join('\n')}

Optimization Constraints:
${Object.entries(data.constraints)
  .filter(([_, value]) => value !== undefined)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

MEXC Exchange Advantages:
${data.mexcParameters?.utilize0Fees ? '✓ 0% trading fees advantage' : '✗ Standard trading fees'}
${data.mexcParameters?.considerLeverage ? `✓ Leverage optimization (max ${data.mexcParameters.maxLeverage || 10}x)` : '✗ No leverage consideration'}

Please provide detailed portfolio optimization including:
1. Optimized asset allocation with reasoning
2. Expected performance metrics (return, volatility, Sharpe ratio, max drawdown)
3. Confidence score in optimization (0-1)
4. MEXC-specific advantages and cost savings
5. Backtest simulation results
6. Specific rebalancing recommendations with priorities
7. Risk-adjusted improvement over current allocation

Focus on practical optimization that takes advantage of MEXC's unique features (0% fees, high leverage options) while respecting the given constraints and objective function.`;

      const schema = z.object({
        optimizationType: z.string(),
        confidence: z.number().min(0).max(1),
        optimizedMetrics: z.object({
          expectedReturn: z.number(),
          volatility: z.number().min(0),
          sharpeRatio: z.number(),
          maxDrawdown: z.number().min(0).max(1),
          informationRatio: z.number().optional(),
        }),
        allocations: z.array(
          z.object({
            symbol: z.string(),
            currentWeight: z.number().min(0).max(1),
            optimizedWeight: z.number().min(0).max(1),
            adjustment: z.number().min(-1).max(1),
            reasoning: z.string(),
          })
        ),
        mexcAdvantages: z
          .object({
            feeSavingsUSD: z.number().min(0).optional(),
            leverageOpportunities: z
              .array(
                z.object({
                  symbol: z.string(),
                  recommendedLeverage: z.number().min(1).max(125),
                  expectedBoost: z.number(),
                })
              )
              .optional(),
          })
          .optional(),
        backtestResults: z
          .object({
            periodMonths: z.number().min(1),
            totalReturn: z.number(),
            annualizedReturn: z.number(),
            maxDrawdown: z.number().min(0).max(1),
            winRate: z.number().min(0).max(1),
            vsBaseline: z.object({
              baselineReturn: z.number(),
              outperformance: z.number(),
            }),
          })
          .optional(),
        recommendations: z.array(
          z.object({
            type: z.enum([
              'allocation_change',
              'rebalance',
              'risk_reduction',
              'leverage_opportunity',
            ]),
            priority: z.enum(['low', 'medium', 'high']),
            description: z.string(),
            expectedImpact: z.string().optional(),
          })
        ),
      });

      // Perform optimization with retry logic
      const result = await retryWithBackoff(
        async () => {
          return await geminiClient.generateObject(prompt, schema, 'Strategy Optimization');
        },
        {
          shouldRetry: true,
          maxRetries: analysisDepth === 'quick' ? 1 : analysisDepth === 'deep' ? 5 : 3,
          retryDelayMs: analysisDepth === 'quick' ? 500 : 1000,
          backoffStrategy: 'exponential',
        }
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Enhance optimization results with MEXC-specific calculations
      const enhancedResult = await this.enhanceWithMEXCAdvantages(result.data, data);

      return {
        success: true,
        ...enhancedResult,
        modelVersion: 'gemini-2.5-flash-preview-05-20',
        tokenUsage: result.usage
          ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
              estimatedCostUSD: (result.usage.totalTokens / 1_000_000) * 0.00075,
            }
          : undefined,
      };
    } catch (error) {
      return handleAIError(error as Error, 'optimization', {
        success: false,
        error: 'Strategy optimization failed',
        optimizationType: data.objectiveFunction,
        confidence: 0,
        optimizedMetrics: {
          expectedReturn: 0,
          volatility: 0,
          sharpeRatio: 0,
          maxDrawdown: 1,
        },
        allocations: data.portfolio.map((asset) => ({
          symbol: asset.symbol,
          currentWeight: asset.currentWeight,
          optimizedWeight: asset.currentWeight, // No change on error
          adjustment: 0,
          reasoning: 'Optimization failed - maintaining current allocation',
        })),
        recommendations: [
          {
            type: 'rebalance',
            priority: 'high',
            description: 'Manual optimization recommended due to analysis failure',
            expectedImpact: 'Unknown - system error occurred',
          },
        ],
      });
    }
  },

  /**
   * Enhance optimization results with MEXC-specific advantages
   */
  async enhanceWithMEXCAdvantages(optimizationResult: any, originalData: any): Promise<any> {
    try {
      // Calculate fee savings from 0% trading fees
      let feeSavingsUSD = 0;
      if (originalData.mexcParameters?.utilize0Fees) {
        // Estimate typical fee savings (assuming 0.1% fees on other exchanges)
        const estimatedTradingVolume = 100000; // Default assumption
        feeSavingsUSD = estimatedTradingVolume * 0.001; // 0.1% fee savings
      }

      // Identify leverage opportunities
      const leverageOpportunities: Array<{
        symbol: string;
        recommendedLeverage: number;
        expectedBoost: number;
      }> = [];

      if (originalData.mexcParameters?.considerLeverage) {
        const maxLeverage = originalData.mexcParameters.maxLeverage || 10;

        // Identify high-confidence assets for leverage
        optimizationResult.allocations?.forEach((allocation: any) => {
          if (
            allocation.optimizedWeight > allocation.currentWeight &&
            allocation.optimizedWeight > 0.1
          ) {
            // Suggest conservative leverage for assets with increased allocation
            const recommendedLeverage = Math.min(2, maxLeverage); // Conservative starting point
            const expectedBoost = (recommendedLeverage - 1) * allocation.optimizedWeight * 0.1; // Estimated boost

            leverageOpportunities.push({
              symbol: allocation.symbol,
              recommendedLeverage,
              expectedBoost,
            });
          }
        });
      }

      // Enhanced MEXC advantages
      const mexcAdvantages = {
        feeSavingsUSD,
        leverageOpportunities: leverageOpportunities.length > 0 ? leverageOpportunities : undefined,
      };

      // Adjust metrics to account for MEXC advantages
      const adjustedMetrics = {
        ...optimizationResult.optimizedMetrics,
        expectedReturn: optimizationResult.optimizedMetrics.expectedReturn + feeSavingsUSD / 100000, // Small boost from fee savings
      };

      return {
        ...optimizationResult,
        optimizedMetrics: adjustedMetrics,
        mexcAdvantages,
      };
    } catch (error) {
      // If enhancement fails, return original result
      console.warn('Failed to enhance with MEXC advantages:', error);
      return optimizationResult;
    }
  },

  /**
   * Perform AI-enhanced trading tools analysis (Task #28)
   * Delegates to the dedicated trading tools service
   */
  async performTradingToolsAnalysis(
    data: {
      action:
        | 'position_sizing'
        | 'stop_loss'
        | 'take_profit'
        | 'risk_reward'
        | 'technical_analysis'
        | 'market_conditions';
      symbol: string;
      accountBalance?: number;
      riskPerTrade?: number;
      entryPrice?: number;
      currentPrice?: number;
      stopLossPrice?: number;
      takeProfitPrice?: number;
      positionSize?: number;
      riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
      timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
      marketVolatility?: number;
      priceHistory?: number[];
      volume?: number;
      indicators?: {
        rsi?: number;
        macd?: number;
        bollinger?: { upper: number; middle: number; lower: number };
      };
      marketData?: {
        volatilityIndex?: number;
        tradingVolume?: number;
        openInterest?: number;
        fundingRate?: number;
      };
    },
    analysisDepth: 'quick' | 'standard' | 'comprehensive' | 'deep' = 'standard'
  ) {
    // Import the trading tools service dynamically to avoid circular dependencies
    const { mcpTradingToolsService } = await import('./services/mcpTradingTools');
    return await mcpTradingToolsService.performTradingToolsAnalysis(data, analysisDepth);
  },
};
