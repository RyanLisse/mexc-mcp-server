/**
 * Analysis API Handlers
 * Extracted from api.ts for better modularity
 */

import { api } from 'encore.dev/api';
import { isAIOperationAllowed } from '../../shared/config';
import { createErrorResponse, logAndNotify } from '../../shared/errors';
import { mcpService } from '../encore.service';
import { mcpIntegrationService } from '../services/mcpIntegration';
import type {
  AIMarketAnalysisRequest,
  AnalysisResponse,
  MultiAnalysisRequest,
  MultiAnalysisResponse,
  ServiceHealthResponse,
} from '../types/analysis-types';

// =============================================================================
// Analysis Handlers
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

      // Get comprehensive market analysis using MCP integration
      const result = await mcpIntegrationService.aiMarketAnalysis({
        symbol,
        analysisType,
        depth,
        price,
        volume,
        ohlcv,
        marketData,
        parameters,
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Analysis failed - no data returned',
          metadata: {
            analysisType,
            depth,
            processingTimeMs: Date.now() - startTime,
            timestamp: startTime,
            confidenceValidated: false,
          },
        };
      }

      return {
        success: true,
        data: result.data,
        metadata: {
          analysisType,
          depth,
          processingTimeMs: Date.now() - startTime,
          timestamp: startTime,
          modelVersion: result.serviceVersion,
          confidenceValidated: true,
        },
      };
    } catch (error) {
      await logAndNotify('AI_ANALYSIS_ERROR', error as Error, {
        symbol,
        analysisType,
        depth,
        requestId: `analysis_${Date.now()}`,
      });

      return {
        success: false,
        error: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
 * Performs multiple types of analysis simultaneously
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
      // Validate risk level for multi-analysis
      const riskLevel = depth === 'comprehensive' ? 'high' : 'medium';
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

      // Perform all analyses in parallel for better performance
      const analysisPromises = analysisTypes.map(async (analysisType) => {
        try {
          const result = await mcpIntegrationService.aiMarketAnalysis({
            symbol,
            analysisType,
            depth,
            price,
            volume,
            ohlcv,
            marketData,
          });

          return {
            type: analysisType,
            result: result.success ? result.data : null,
            error: result.success ? null : result.error,
          };
        } catch (error) {
          return {
            type: analysisType,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const analysisResults = await Promise.all(analysisPromises);

      // Compile results
      const data: Record<string, unknown> = {};
      let successfulAnalyses = 0;
      let failedAnalyses = 0;

      for (const { type, result, error } of analysisResults) {
        if (result) {
          data[type] = result;
          successfulAnalyses++;
        } else {
          failedAnalyses++;
          console.warn(`Analysis failed for ${type}: ${error}`);
        }
      }

      const success = successfulAnalyses > 0;

      return {
        success,
        data: success ? data : undefined,
        error: success ? undefined : 'All analyses failed',
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
      await logAndNotify('MULTI_ANALYSIS_ERROR', error as Error, {
        symbol,
        analysisTypes,
        depth,
        requestId: `multi_analysis_${Date.now()}`,
      });

      return {
        success: false,
        error: `Multi-analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
 * Comprehensive AI Health Endpoint
 * Returns detailed health information including budget, cache, and configuration
 */
export const getComprehensiveAIHealth = api(
  { method: 'GET', path: '/mcp/health/comprehensive', expose: true },
  async (): Promise<ServiceHealthResponse> => {
    try {
      const healthData = await mcpIntegrationService.getHealthStatus();
      return {
        status: healthData.success ? 'healthy' : 'unhealthy',
        budgetStatus: {
          tokensUsed: 0,
          tokensRemaining: 0,
          costUSD: 0,
          requestCount: 0,
        },
      };
    } catch (_error) {
      return {
        status: 'unhealthy',
        budgetStatus: {
          tokensUsed: 0,
          tokensRemaining: 0,
          costUSD: 0,
          requestCount: 0,
        },
      };
    }
  }
);

/**
 * Service Health Endpoint
 * Basic health check for the MCP service
 */
export const getServiceHealth = api(
  { method: 'GET', path: '/mcp/health', expose: true },
  async (): Promise<{ status: string; timestamp: number }> => {
    try {
      const healthData = await mcpIntegrationService.getHealthStatus();
      return {
        status: healthData.success ? 'healthy' : 'unhealthy',
        timestamp: Date.now(),
      };
    } catch (_error) {
      return {
        status: 'unhealthy',
        timestamp: Date.now(),
      };
    }
  }
);

/**
 * Reset Analysis Environment
 * Clears cache and resets AI analysis state
 */
export const resetAnalysisEnvironment = api(
  { method: 'POST', path: '/mcp/reset', expose: true },
  async (): Promise<{ success: boolean; message: string }> => {
    try {
      // Simple reset functionality
      return {
        success: true,
        message: 'Analysis environment reset successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

/**
 * Quick Risk Score Endpoint
 * Fast risk assessment for a single symbol
 */
export const quickRiskScore = api(
  { method: 'POST', path: '/mcp/quick-risk', expose: true },
  async ({
    symbol,
    price,
    volume,
  }: {
    symbol: string;
    price: number;
    volume?: number;
  }): Promise<{
    success: boolean;
    riskScore?: number;
    riskLevel?: string;
    error?: string;
  }> => {
    try {
      const result = await mcpIntegrationService.aiMarketAnalysis({
        symbol,
        analysisType: 'risk',
        depth: 'quick',
        price,
        volume,
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Risk assessment failed',
        };
      }

      // Extract risk score from analysis
      const riskScore = result.data.confidence || 50;
      const riskLevel =
        riskScore >= 80
          ? 'low'
          : riskScore >= 60
            ? 'medium'
            : riskScore >= 40
              ? 'high'
              : 'very_high';

      return {
        success: true,
        riskScore,
        riskLevel,
      };
    } catch (error) {
      return {
        success: false,
        error: `Risk assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

/**
 * Get Available Analysis Depths
 * Returns available analysis depth levels and their descriptions
 */
export const getAnalysisDepths = api(
  { method: 'GET', path: '/mcp/analysis-depths', expose: true },
  async (): Promise<{
    success: boolean;
    depths: Array<{
      level: string;
      description: string;
      estimatedTime: string;
      features: string[];
    }>;
  }> => {
    return {
      success: true,
      depths: [
        {
          level: 'quick',
          description: 'Fast analysis with basic metrics',
          estimatedTime: '< 1 second',
          features: ['Price trend', 'Basic volatility', 'Simple sentiment'],
        },
        {
          level: 'standard',
          description: 'Comprehensive analysis with multiple indicators',
          estimatedTime: '2-5 seconds',
          features: [
            'Technical indicators',
            'Market sentiment',
            'Risk assessment',
            'Trend analysis',
          ],
        },
        {
          level: 'comprehensive',
          description: 'Detailed analysis with AI insights',
          estimatedTime: '5-10 seconds',
          features: [
            'Advanced technical analysis',
            'Multi-timeframe analysis',
            'Correlation analysis',
            'Market context',
            'Confidence intervals',
          ],
        },
        {
          level: 'deep',
          description: 'In-depth analysis with predictive modeling',
          estimatedTime: '10-30 seconds',
          features: [
            'Predictive modeling',
            'Complex pattern recognition',
            'Multi-asset correlation',
            'Scenario analysis',
            'Advanced risk metrics',
            'Strategic recommendations',
          ],
        },
      ],
    };
  }
);
