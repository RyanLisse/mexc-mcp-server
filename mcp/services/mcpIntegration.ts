/**
 * MCP Integration Service
 * Task #31: Unified interface that orchestrates all AI-enhanced trading tools
 * Provides the main integration layer for MCP service functionality
 */

import type { AnalysisParameters, AnalysisType } from '../../shared/types/ai-types';
import type {
  AIMarketAnalysisRequest,
  RiskAssessmentRequest,
  ServiceResponse,
  StrategyOptimizerRequest,
  TradingToolsRequest,
} from '../../shared/types/mcp-integration-types';
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
import { mcpHealthService, type ComprehensiveHealthResponse } from './mcpHealthService';


// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Creates a standardized service response
 */
function createServiceResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  startTime?: number
): ServiceResponse<T> {
  return {
    success,
    data,
    error,
    timestamp: startTime || Date.now(),
    processingTimeMs: startTime ? Date.now() - startTime : 0,
    serviceVersion: 'mcp-integration-v1.0',
  };
}

/**
 * Creates an error response with standardized format
 */
function createErrorResponse(error: Error | string, operation: string, startTime?: number): ServiceResponse {
  const errorMessage = error instanceof Error ? error.message : error;
  return createServiceResponse(false, undefined, `${operation} failed: ${errorMessage}`, startTime);
}

/**
 * Validates portfolio data
 */
function validatePortfolio(portfolio: any[], totalValue?: number): string | null {
  if (!portfolio || !Array.isArray(portfolio) || portfolio.length === 0) {
    return 'Portfolio is required and must contain at least one asset';
  }
  if (totalValue !== undefined && (typeof totalValue !== 'number' || totalValue <= 0)) {
    return 'Total value must be a positive number';
  }
  return null;
}

/**
 * Validates strategy optimizer request
 */
function validateStrategyRequest(request: StrategyOptimizerRequest): string | null {
  const portfolioError = validatePortfolio(request.portfolio);
  if (portfolioError) return portfolioError;
  
  if (!request.objectiveFunction) {
    return 'Objective function is required';
  }
  
  const totalWeight = request.portfolio.reduce((sum, asset) => sum + asset.allocation, 0);
  if (Math.abs(totalWeight - 1) > 0.01) {
    return 'Portfolio allocations must sum to approximately 1.0';
  }
  
  return null;
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
   */
  async aiMarketAnalysis(request: AIMarketAnalysisRequest): Promise<ServiceResponse<EnhancedAnalysisResult>> {
    try {
      const startTime = Date.now();

      if (!request.symbol || !request.analysisType) {
        return createServiceResponse(false, undefined, 'Symbol and analysis type are required', startTime);
      }

      const marketData: MarketAnalysisData = {
        symbol: request.symbol,
        price: request.price,
        volume: request.volume,
        marketData: request.marketData,
        ohlcv: request.ohlcv,
      };

      const result = await mcpAnalysisService.performMarketAnalysis(
        marketData,
        request.analysisType,
        request.depth || 'standard',
        request.parameters
      );

      return createServiceResponse(result.success, result, result.error, startTime);
    } catch (error) {
      return createErrorResponse(error as Error, 'AI market analysis');
    }
  },

  /**
   * Risk Assessment Integration
   * Connects to the risk service for portfolio risk evaluation
   */
  async riskAssessment(request: RiskAssessmentRequest): Promise<ServiceResponse<RiskAssessmentResponse>> {
    try {
      const startTime = Date.now();
      
      const validationError = validatePortfolio(request.portfolio, request.totalValue);
      if (validationError) {
        return createServiceResponse(false, undefined, validationError, startTime);
      }

      const portfolioData: PortfolioRiskData = {
        portfolio: request.portfolio,
        totalValue: request.totalValue,
        riskTolerance: request.riskTolerance,
        timeHorizon: request.timeHorizon,
        marketContext: request.marketContext,
      };

      const result = await mcpRiskService.performRiskAssessment(
        portfolioData,
        request.analysisDepth || 'standard'
      );

      return createServiceResponse(result.success, result, result.error, startTime);
    } catch (error) {
      return createErrorResponse(error as Error, 'Risk assessment');
    }
  },

  /**
   * Strategy Optimizer (Task #27 Implementation)
   * AI-powered portfolio optimization leveraging MEXC's unique features
   */
  async strategyOptimizer(request: StrategyOptimizerRequest): Promise<ServiceResponse<any>> {
    try {
      const startTime = Date.now();
      
      const validationError = validateStrategyRequest(request);
      if (validationError) {
        return createServiceResponse(false, undefined, validationError, startTime);
      }

      const optimizationData = {
        portfolio: request.portfolio.map((asset) => ({
          symbol: asset.symbol,
          currentWeight: asset.allocation,
          historicalReturns: undefined,
        })),
        objectiveFunction: request.objectiveFunction,
        constraints: request.constraints,
        timeHorizon: request.timeHorizon,
        rebalanceFrequency: request.rebalanceFrequency,
        mexcParameters: {
          utilize0Fees: true,
          considerLeverage: request.objectiveFunction === 'max_return',
          maxLeverage: 10,
        },
      };

      const result = await mcpService.performStrategyOptimization(optimizationData, 'standard');
      
      if (!result.success) {
        return createServiceResponse(false, undefined, result.error || 'Strategy optimization failed', startTime);
      }

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

      return createServiceResponse(true, optimizationResult, undefined, startTime);
    } catch (error) {
      return createErrorResponse(error as Error, 'Strategy optimization');
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
   */
  getServiceInfo(): ServiceResponse<{
    version: string;
    availableEndpoints: string[];
    implementedFeatures: string[];
    pendingFeatures: string[];
    dependencies: string[];
  }> {
    return createServiceResponse(true, {
      version: 'mcp-integration-v1.0',
      availableEndpoints: [
        'aiMarketAnalysis', 'riskAssessment', 'strategyOptimizer', 'tradingTools',
        'performMultiAnalysis', 'getUnifiedHealth', 'resetEnvironment', 'getServiceInfo'
      ],
      implementedFeatures: [
        'AI Market Analysis (Task #24)', 'Risk Assessment (Task #26)',
        'Strategy Optimizer (Task #27)', 'Trading Tools (Task #28)',
        'Multi-Analysis Support', 'Service Health Monitoring', 'Environment Management'
      ],
      pendingFeatures: [],
      dependencies: [
        'mcpCoreService', 'mcpAnalysisService', 'mcpRiskService',
        'geminiAnalyzer', 'geminiClient'
      ],
    });
  },

  /**
   * Comprehensive AI Health Check (Task #32)
   * Delegates to dedicated health service for detailed monitoring
   * @returns Comprehensive health response with detailed service status
   */
  async getHealthStatus(): Promise<ServiceResponse<ComprehensiveHealthResponse>> {
    return await mcpHealthService.getHealthStatus();
  },
};
