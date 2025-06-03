/**
 * MCP Integration Service
 * Task #31: Unified interface that orchestrates all AI-enhanced trading tools
 * Provides the main integration layer for MCP service functionality
 */

import type { AnalysisParameters, AnalysisType } from '../../shared/types/ai-types';
import { mcpService } from '../encore.service';
import {
  type EnhancedAnalysisResult,
  type MarketAnalysisData,
  mcpAnalysisService,
} from './mcpAnalysis';
import {
  type EnvironmentResetResponse,
  type ServiceHealthResponse,
  mcpCoreService,
} from './mcpCore';
import { type PortfolioRiskData, type RiskAssessmentResponse, mcpRiskService } from './mcpRisk';
import { mcpTradingToolsService } from './mcpTradingTools';

// =============================================================================
// Integration Service Types and Interfaces
// =============================================================================

/**
 * AI Market Analysis Request
 */
export interface AIMarketAnalysisRequest {
  symbol: string;
  analysisType: AnalysisType;
  depth?: 'quick' | 'standard' | 'comprehensive' | 'deep';
  parameters?: AnalysisParameters;
  price?: number;
  volume?: number;
  marketData?: unknown;
  ohlcv?: unknown[];
}

/**
 * Risk Assessment Request
 */
export interface RiskAssessmentRequest {
  portfolio: Array<{
    symbol: string;
    quantity: number;
    currentPrice: number;
    entryPrice?: number;
    assetType?: 'crypto' | 'stock' | 'commodity' | 'forex';
  }>;
  totalValue: number;
  analysisDepth?: 'quick' | 'standard' | 'comprehensive' | 'deep';
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
}

/**
 * Strategy Optimizer Request (Placeholder for Task #27)
 */
export interface StrategyOptimizerRequest {
  portfolio: Array<{
    symbol: string;
    allocation: number;
  }>;
  objectiveFunction: 'sharpe_ratio' | 'max_return' | 'min_risk' | 'custom';
  constraints: {
    maxRisk?: number;
    minReturn?: number;
    maxDrawdown?: number;
    maxPositionSize?: number;
  };
  timeHorizon?: 'short' | 'medium' | 'long';
  rebalanceFrequency?: 'daily' | 'weekly' | 'monthly';
}

/**
 * Trading Tools Request (Placeholder for Task #28)
 */
export interface TradingToolsRequest {
  action: 'position_sizing' | 'stop_loss' | 'take_profit' | 'risk_reward' | 'technical_analysis';
  symbol: string;
  accountBalance: number;
  riskPerTrade?: number;
  entryPrice?: number;
  currentPrice?: number;
  timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
}

/**
 * Generic service response interface
 */
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
  processingTimeMs?: number;
  serviceVersion?: string;
}

// =============================================================================
// Main Integration Service Implementation
// =============================================================================

/**
 * Unified MCP Integration Service
 * Orchestrates all AI-enhanced trading tools and services
 */
export const mcpIntegrationService = {
  /**
   * AI Market Analysis Integration
   * Connects to the analysis service for comprehensive market insights
   * @param request Market analysis request parameters
   * @returns Enhanced analysis results
   */
  async aiMarketAnalysis(
    request: AIMarketAnalysisRequest
  ): Promise<ServiceResponse<EnhancedAnalysisResult>> {
    try {
      const startTime = Date.now();

      // Validate request parameters
      if (!request.symbol || !request.analysisType) {
        return {
          success: false,
          error: 'Symbol and analysis type are required',
          timestamp: startTime,
          serviceVersion: 'mcp-integration-v1.0',
        };
      }

      // Prepare market data for analysis
      const marketData: MarketAnalysisData = {
        symbol: request.symbol,
        price: request.price,
        volume: request.volume,
        marketData: request.marketData,
        ohlcv: request.ohlcv,
      };

      // Perform the analysis using the analysis service
      const result = await mcpAnalysisService.performMarketAnalysis(
        marketData,
        request.analysisType,
        request.depth || 'standard',
        request.parameters
      );

      return {
        success: result.success,
        data: result,
        error: result.error,
        timestamp: startTime,
        processingTimeMs: Date.now() - startTime,
        serviceVersion: 'mcp-integration-v1.0',
      };
    } catch (error) {
      return {
        success: false,
        error: `AI market analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        serviceVersion: 'mcp-integration-v1.0',
      };
    }
  },

  /**
   * Risk Assessment Integration
   * Connects to the risk service for portfolio risk evaluation
   * @param request Risk assessment request parameters
   * @returns Risk assessment results
   */
  async riskAssessment(
    request: RiskAssessmentRequest
  ): Promise<ServiceResponse<RiskAssessmentResponse>> {
    try {
      const startTime = Date.now();

      // Validate request parameters
      if (
        !request.portfolio ||
        !Array.isArray(request.portfolio) ||
        request.portfolio.length === 0
      ) {
        return {
          success: false,
          error: 'Portfolio is required and must contain at least one asset',
          timestamp: startTime,
          serviceVersion: 'mcp-integration-v1.0',
        };
      }

      if (typeof request.totalValue !== 'number' || request.totalValue <= 0) {
        return {
          success: false,
          error: 'Total value must be a positive number',
          timestamp: startTime,
          serviceVersion: 'mcp-integration-v1.0',
        };
      }

      // Prepare portfolio data for risk assessment
      const portfolioData: PortfolioRiskData = {
        portfolio: request.portfolio,
        totalValue: request.totalValue,
        riskTolerance: request.riskTolerance,
        timeHorizon: request.timeHorizon,
        marketContext: request.marketContext,
      };

      // Perform the risk assessment using the risk service
      const result = await mcpRiskService.performRiskAssessment(
        portfolioData,
        request.analysisDepth || 'standard'
      );

      return {
        success: result.success,
        data: result,
        error: result.error,
        timestamp: startTime,
        processingTimeMs: Date.now() - startTime,
        serviceVersion: 'mcp-integration-v1.0',
      };
    } catch (error) {
      return {
        success: false,
        error: `Risk assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        serviceVersion: 'mcp-integration-v1.0',
      };
    }
  },

  /**
   * Strategy Optimizer (Task #27 Implementation)
   * AI-powered portfolio optimization leveraging MEXC's unique features
   * @param request Strategy optimization request parameters
   * @returns Strategy optimization results
   */
  async strategyOptimizer(request: StrategyOptimizerRequest): Promise<ServiceResponse<any>> {
    try {
      const startTime = Date.now();

      // Validate request parameters
      if (
        !request.portfolio ||
        !Array.isArray(request.portfolio) ||
        request.portfolio.length === 0
      ) {
        return {
          success: false,
          error: 'Portfolio is required and must contain at least one asset',
          timestamp: startTime,
          serviceVersion: 'mcp-integration-v1.0',
        };
      }

      if (!request.objectiveFunction) {
        return {
          success: false,
          error: 'Objective function is required',
          timestamp: startTime,
          serviceVersion: 'mcp-integration-v1.0',
        };
      }

      // Validate portfolio weights sum to approximately 1
      const totalWeight = request.portfolio.reduce((sum, asset) => sum + asset.allocation, 0);
      if (Math.abs(totalWeight - 1) > 0.01) {
        return {
          success: false,
          error: 'Portfolio allocations must sum to approximately 1.0',
          timestamp: startTime,
          serviceVersion: 'mcp-integration-v1.0',
        };
      }

      // Convert request format to match the core service expected format
      const optimizationData = {
        portfolio: request.portfolio.map((asset) => ({
          symbol: asset.symbol,
          currentWeight: asset.allocation,
          historicalReturns: undefined, // Could be enhanced with real data in the future
        })),
        objectiveFunction: request.objectiveFunction,
        constraints: request.constraints,
        timeHorizon: request.timeHorizon,
        rebalanceFrequency: request.rebalanceFrequency,
        mexcParameters: {
          utilize0Fees: true, // Always leverage MEXC's 0% fees
          considerLeverage: request.objectiveFunction === 'max_return',
          maxLeverage: 10, // Conservative default
        },
      };

      // Use the core service for optimization
      const result = await mcpService.performStrategyOptimization(
        optimizationData,
        'standard' // Default analysis depth
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Strategy optimization failed',
          timestamp: startTime,
          processingTimeMs: Date.now() - startTime,
          serviceVersion: 'mcp-integration-v1.0',
        };
      }

      // Transform the result to match integration service format
      const optimizationResult = {
        optimizationType: result.optimizationType || request.objectiveFunction,
        confidence: result.confidence || 0,
        optimizedMetrics: result.optimizedMetrics || {
          expectedReturn: 0,
          volatility: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
        },
        allocations: result.allocations || [],
        mexcAdvantages: result.mexcAdvantages,
        backtestResults: result.backtestResults,
        recommendations: result.recommendations || [],
        modelVersion: result.modelVersion,
        tokenUsage: result.tokenUsage,
      };

      return {
        success: true,
        data: optimizationResult,
        timestamp: startTime,
        processingTimeMs: Date.now() - startTime,
        serviceVersion: 'mcp-integration-v1.0',
      };
    } catch (error) {
      return {
        success: false,
        error: `Strategy optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        serviceVersion: 'mcp-integration-v1.0',
      };
    }
  },

  /**
   * Trading Tools (Task #28 Implementation)
   * AI-enhanced trading tools with position sizing, technical analysis, and market conditions
   * @param request Trading tools request parameters
   * @returns Trading tools analysis results
   */
  async tradingTools(request: TradingToolsRequest): Promise<ServiceResponse<any>> {
    try {
      const startTime = Date.now();

      // Validate request parameters
      if (!request.symbol || !request.action) {
        return {
          success: false,
          error: 'Symbol and action are required',
          timestamp: startTime,
          serviceVersion: 'mcp-integration-v1.0',
        };
      }

      if (typeof request.accountBalance === 'number' && request.accountBalance <= 0) {
        return {
          success: false,
          error: 'Account balance must be a positive number',
          timestamp: startTime,
          serviceVersion: 'mcp-integration-v1.0',
        };
      }

      if (
        typeof request.riskPerTrade === 'number' &&
        (request.riskPerTrade <= 0 || request.riskPerTrade > 1)
      ) {
        return {
          success: false,
          error: 'Risk per trade must be between 0 and 1 (0-100%)',
          timestamp: startTime,
          serviceVersion: 'mcp-integration-v1.0',
        };
      }

      // Prepare trading tools data for analysis
      const tradingToolsData = {
        action: request.action,
        symbol: request.symbol,
        accountBalance: request.accountBalance,
        riskPerTrade: request.riskPerTrade,
        entryPrice: request.entryPrice,
        currentPrice: request.currentPrice,
        timeframe: request.timeframe,
        // Add MEXC-specific features
        ...((request as any).mexcFeatures && {
          mexcFeatures: (request as any).mexcFeatures,
        }),
      };

      // Use the trading tools service directly for analysis
      const result = await mcpTradingToolsService.performTradingToolsAnalysis(
        tradingToolsData,
        'standard' // Default analysis depth
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Trading tools analysis failed',
          timestamp: startTime,
          processingTimeMs: Date.now() - startTime,
          serviceVersion: 'mcp-integration-v1.0',
        };
      }

      // Transform the result to match integration service format
      const tradingToolsResult = {
        toolType: result.toolType || request.action,
        confidence: result.confidence || 0,
        positionSizing: result.positionSizing,
        riskManagement: result.riskManagement,
        technicalAnalysis: result.technicalAnalysis,
        marketConditions: result.marketConditions,
        recommendations: result.recommendations || [],
        mexcAdvantages: result.mexcAdvantages,
        modelVersion: result.modelVersion,
        tokenUsage: result.tokenUsage,
      };

      return {
        success: true,
        data: tradingToolsResult,
        timestamp: startTime,
        processingTimeMs: Date.now() - startTime,
        serviceVersion: 'mcp-integration-v1.0',
      };
    } catch (error) {
      return {
        success: false,
        error: `Trading tools analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        serviceVersion: 'mcp-integration-v1.0',
      };
    }
  },

  /**
   * Multi-Analysis Integration
   * Perform multiple analysis types in a single request
   * @param request Market analysis request with multiple types
   * @returns Results for all requested analysis types
   */
  async performMultiAnalysis(
    request: Omit<AIMarketAnalysisRequest, 'analysisType'> & { analysisTypes: AnalysisType[] }
  ): Promise<ServiceResponse<Record<AnalysisType, EnhancedAnalysisResult>>> {
    try {
      const startTime = Date.now();

      // Validate request parameters
      if (!request.symbol || !request.analysisTypes || request.analysisTypes.length === 0) {
        return {
          success: false,
          error: 'Symbol and analysis types are required',
          timestamp: startTime,
        };
      }

      // Prepare market data for analysis
      const marketData: MarketAnalysisData = {
        symbol: request.symbol,
        price: request.price,
        volume: request.volume,
        marketData: request.marketData,
        ohlcv: request.ohlcv,
      };

      // Perform multi-analysis using the analysis service
      const depth =
        request.depth === 'comprehensive' || request.depth === 'deep'
          ? request.depth
          : 'comprehensive';

      const results = await mcpAnalysisService.performMultiAnalysis(
        marketData,
        request.analysisTypes,
        depth,
        request.parameters
      );

      // Calculate overall success
      const analysisTypes = Object.keys(results) as AnalysisType[];
      const successfulAnalyses = analysisTypes.filter((type) => results[type].success);
      const overallSuccess = successfulAnalyses.length > 0;

      return {
        success: overallSuccess,
        data: results,
        error: overallSuccess ? undefined : 'All analyses failed',
        timestamp: startTime,
        processingTimeMs: Date.now() - startTime,
        serviceVersion: 'mcp-integration-v1.0',
      };
    } catch (error) {
      return {
        success: false,
        error: `Multi-analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        serviceVersion: 'mcp-integration-v1.0',
      };
    }
  },

  /**
   * Service Health Integration
   * Get comprehensive health status from all services
   * @returns Unified service health information
   */
  getUnifiedHealth(): ServiceResponse<ServiceHealthResponse> {
    try {
      const startTime = Date.now();
      const health = mcpCoreService.getServiceHealth();

      return {
        success: true,
        data: health,
        timestamp: startTime,
        processingTimeMs: Date.now() - startTime,
        serviceVersion: 'mcp-integration-v1.0',
      };
    } catch (error) {
      return {
        success: false,
        error: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        serviceVersion: 'mcp-integration-v1.0',
      };
    }
  },

  /**
   * Environment Reset Integration
   * Reset analysis environment across all services
   * @returns Environment reset results
   */
  resetEnvironment(): ServiceResponse<EnvironmentResetResponse> {
    try {
      const startTime = Date.now();
      const result = mcpCoreService.resetAnalysisEnvironment();

      return {
        success: result.success,
        data: result,
        error: result.success ? undefined : result.message,
        timestamp: startTime,
        processingTimeMs: Date.now() - startTime,
        serviceVersion: 'mcp-integration-v1.0',
      };
    } catch (error) {
      return {
        success: false,
        error: `Environment reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        serviceVersion: 'mcp-integration-v1.0',
      };
    }
  },

  /**
   * Get Integration Service Information
   * Returns information about the integration service and available endpoints
   * @returns Service information and capabilities
   */
  getServiceInfo(): ServiceResponse<{
    version: string;
    availableEndpoints: string[];
    implementedFeatures: string[];
    pendingFeatures: string[];
    dependencies: string[];
  }> {
    return {
      success: true,
      data: {
        version: 'mcp-integration-v1.0',
        availableEndpoints: [
          'aiMarketAnalysis',
          'riskAssessment',
          'strategyOptimizer',
          'tradingTools',
          'performMultiAnalysis',
          'getUnifiedHealth',
          'resetEnvironment',
          'getServiceInfo',
        ],
        implementedFeatures: [
          'AI Market Analysis (Task #24)',
          'Risk Assessment (Task #26)',
          'Strategy Optimizer (Task #27)',
          'Trading Tools (Task #28)',
          'Multi-Analysis Support',
          'Service Health Monitoring',
          'Environment Management',
        ],
        pendingFeatures: [],
        dependencies: [
          'mcpCoreService',
          'mcpAnalysisService',
          'mcpRiskService',
          'geminiAnalyzer',
          'geminiClient',
        ],
      },
      timestamp: Date.now(),
      serviceVersion: 'mcp-integration-v1.0',
    };
  },
};
