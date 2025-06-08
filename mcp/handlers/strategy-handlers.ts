/**
 * Strategy and Portfolio API Handlers
 * Extracted from api.ts for better modularity
 */

import { api } from 'encore.dev/api';
import { isAIOperationAllowed } from '../../shared/config';
import { createErrorResponse, logAndNotify } from '../../shared/errors';
import { mcpService } from '../encore.service';
import { mcpIntegrationService } from '../services/mcpIntegration';
import type {
  PortfolioRiskAssessmentRequest,
  RiskAssessmentResponse,
  StrategyOptimizerRequest,
  StrategyOptimizerResponse,
  TradingToolsRequest,
  TradingToolsResponse,
} from '../types/strategy-types';

// =============================================================================
// Strategy Handlers
// =============================================================================

/**
 * Strategy Optimizer Endpoint
 * Optimizes trading strategies using AI analysis
 */
export const strategyOptimizer = api(
  { method: 'POST', path: '/mcp/strategy-optimizer', expose: true },
  async ({
    symbol,
    strategyType,
    marketData,
    ohlcv,
    parameters,
    optimization,
  }: StrategyOptimizerRequest): Promise<StrategyOptimizerResponse> => {
    const startTime = Date.now();

    try {
      // Validate risk level for strategy optimization
      if (!isAIOperationAllowed('high')) {
        return {
          success: false,
          error: 'Strategy optimization not allowed for current risk level',
          metadata: {
            strategyType,
            optimizationTime: Date.now() - startTime,
            dataPoints: ohlcv?.length || 0,
            modelVersion: 'N/A',
            timestamp: startTime,
          },
        };
      }

      // Perform strategy optimization using MCP integration
      const result = await mcpIntegrationService.strategyOptimizer({
        symbol,
        strategyType,
        marketData,
        ohlcv,
        parameters,
        optimization,
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Strategy optimization failed - no data returned',
          metadata: {
            strategyType,
            optimizationTime: Date.now() - startTime,
            dataPoints: ohlcv?.length || 0,
            modelVersion: 'N/A',
            timestamp: startTime,
          },
        };
      }

      return {
        success: true,
        data: result.data,
        metadata: {
          strategyType,
          optimizationTime: Date.now() - startTime,
          dataPoints: ohlcv?.length || 0,
          modelVersion: result.serviceVersion || 'latest',
          timestamp: startTime,
        },
      };
    } catch (error) {
      await logAndNotify('STRATEGY_OPTIMIZATION_ERROR', error as Error, {
        symbol,
        strategyType,
        requestId: `strategy_${Date.now()}`,
      });

      return {
        success: false,
        error: `Strategy optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          strategyType,
          optimizationTime: Date.now() - startTime,
          dataPoints: ohlcv?.length || 0,
          modelVersion: 'N/A',
          timestamp: startTime,
        },
      };
    }
  }
);

// =============================================================================
// Portfolio Risk Handlers
// =============================================================================

/**
 * Portfolio Risk Assessment Endpoint
 * Comprehensive risk analysis for portfolio holdings
 */
export const portfolioRiskAssessment = api(
  { method: 'POST', path: '/mcp/portfolio-risk', expose: true },
  async ({
    holdings,
    totalValue,
    marketConditions,
    parameters,
  }: PortfolioRiskAssessmentRequest): Promise<RiskAssessmentResponse> => {
    const startTime = Date.now();

    try {
      // Validate risk level for portfolio assessment
      if (!isAIOperationAllowed('medium')) {
        return {
          success: false,
          error: 'Portfolio risk assessment not allowed for current risk level',
          metadata: {
            assessmentTime: Date.now() - startTime,
            dataPoints: holdings.length,
            modelVersion: 'N/A',
            timestamp: startTime,
          },
        };
      }

      // Perform portfolio risk assessment using MCP integration
      const result = await mcpIntegrationService.riskAssessment({
        holdings,
        totalValue,
        marketConditions,
        parameters,
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Portfolio risk assessment failed - no data returned',
          metadata: {
            assessmentTime: Date.now() - startTime,
            dataPoints: holdings.length,
            modelVersion: 'N/A',
            timestamp: startTime,
          },
        };
      }

      return {
        success: true,
        data: result.data,
        metadata: {
          assessmentTime: Date.now() - startTime,
          dataPoints: holdings.length,
          modelVersion: result.serviceVersion || 'latest',
          timestamp: startTime,
        },
      };
    } catch (error) {
      await logAndNotify('PORTFOLIO_RISK_ERROR', error as Error, {
        portfolioValue: totalValue,
        holdingsCount: holdings.length,
        requestId: `portfolio_risk_${Date.now()}`,
      });

      return {
        success: false,
        error: `Portfolio risk assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          assessmentTime: Date.now() - startTime,
          dataPoints: holdings.length,
          modelVersion: 'N/A',
          timestamp: startTime,
        },
      };
    }
  }
);

// =============================================================================
// Trading Tools Handlers
// =============================================================================

/**
 * Trading Tools Endpoint
 * Provides various trading calculation tools
 */
export const tradingTools = api(
  { method: 'POST', path: '/mcp/trading-tools', expose: true },
  async ({
    toolType,
    symbol,
    marketData,
    parameters,
  }: TradingToolsRequest): Promise<TradingToolsResponse> => {
    const startTime = Date.now();

    try {
      // Validate risk level for trading tools (generally low risk)
      if (!isAIOperationAllowed('low')) {
        return {
          success: false,
          error: 'Trading tools not allowed for current risk level',
          metadata: {
            toolType,
            calculationTime: Date.now() - startTime,
            timestamp: startTime,
          },
        };
      }

      // Perform trading calculations using MCP integration
      const result = await mcpIntegrationService.tradingTools({
        toolType,
        symbol,
        marketData,
        parameters,
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Trading tools calculation failed - no data returned',
          metadata: {
            toolType,
            calculationTime: Date.now() - startTime,
            timestamp: startTime,
          },
        };
      }

      return {
        success: true,
        data: result.data,
        metadata: {
          toolType,
          calculationTime: Date.now() - startTime,
          timestamp: startTime,
        },
      };
    } catch (error) {
      await logAndNotify('TRADING_TOOLS_ERROR', error as Error, {
        toolType,
        symbol,
        requestId: `trading_tools_${Date.now()}`,
      });

      return {
        success: false,
        error: `Trading tools failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          toolType,
          calculationTime: Date.now() - startTime,
          timestamp: startTime,
        },
      };
    }
  }
);
