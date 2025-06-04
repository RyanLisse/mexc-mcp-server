/**
 * Trading Tools Test Suite (Task #28)
 * Comprehensive tests for AI-Enhanced Trading Tools Endpoint
 * TDD Implementation - Tests written first
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mcpService } from '../encore.service';
import { mcpIntegrationService } from '../services/mcpIntegration';

describe('Trading Tools - Task #28', () => {
  // Test data for trading tools functionality
  const validPositionSizingRequest = {
    action: 'position_sizing' as const,
    symbol: 'BTCUSDT',
    accountBalance: 10000,
    riskPerTrade: 0.02,
    entryPrice: 50000,
    currentPrice: 50000,
    timeframe: '1h' as const,
  };

  const validTechnicalAnalysisRequest = {
    action: 'technical_analysis' as const,
    symbol: 'ETHUSDT',
    accountBalance: 5000,
    currentPrice: 3200,
    timeframe: '4h' as const,
  };

  const validMarketConditionsRequest = {
    action: 'market_conditions' as const,
    symbol: 'BNBUSDT',
    accountBalance: 1000,
    currentPrice: 300,
    timeframe: '1d' as const,
  };

  describe('Core Trading Tools Service', () => {
    it('should successfully perform position sizing calculation', async () => {
      const result = await mcpService.performTradingToolsAnalysis(
        {
          action: 'position_sizing',
          symbol: 'BTCUSDT',
          accountBalance: 10000,
          riskPerTrade: 0.02,
          entryPrice: 50000,
          currentPrice: 50000,
          stopLossPrice: 48000,
          marketVolatility: 0.15,
        },
        'standard'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.toolType).toBe('position_sizing');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // Verify position sizing results structure
      expect(result.positionSizing).toBeDefined();
      expect(result.positionSizing?.recommendedSize).toBeTypeOf('number');
      expect(result.positionSizing?.recommendedSize).toBeGreaterThan(0);
      expect(result.positionSizing?.riskAmount).toBeTypeOf('number');
      expect(result.positionSizing?.riskPercentage).toBeLessThanOrEqual(0.02);
      expect(result.positionSizing?.leverageRecommendation).toBeTypeOf('number');

      // Verify risk management
      expect(result.riskManagement).toBeDefined();
      expect(result.riskManagement?.stopLossPrice).toBeTypeOf('number');
      expect(result.riskManagement?.takeProfitPrice).toBeTypeOf('number');
      expect(result.riskManagement?.riskRewardRatio).toBeGreaterThan(0);
    }, 30000);

    it('should perform technical analysis with chart patterns and indicators', async () => {
      const result = await mcpService.performTradingToolsAnalysis(
        {
          action: 'technical_analysis',
          symbol: 'ETHUSDT',
          currentPrice: 3200,
          priceHistory: [3100, 3150, 3180, 3200],
          volume: 1000000,
          indicators: {
            rsi: 65,
            macd: 0.5,
            bollinger: { upper: 3250, middle: 3200, lower: 3150 },
          },
        },
        'comprehensive'
      );

      expect(result.success).toBe(true);
      expect(result.toolType).toBe('technical_analysis');

      // Verify technical analysis structure
      expect(result.technicalAnalysis).toBeDefined();
      expect(result.technicalAnalysis?.trendDirection).toMatch(
        /^(bullish|bearish|neutral|sideways)$/
      );
      expect(result.technicalAnalysis?.strength).toBeGreaterThanOrEqual(0);
      expect(result.technicalAnalysis?.strength).toBeLessThanOrEqual(1);
      expect(result.technicalAnalysis?.signals).toBeDefined();
      expect(Array.isArray(result.technicalAnalysis?.signals)).toBe(true);

      // Verify support and resistance levels
      expect(result.technicalAnalysis?.supportLevels).toBeDefined();
      expect(result.technicalAnalysis?.resistanceLevels).toBeDefined();
      expect(Array.isArray(result.technicalAnalysis?.supportLevels)).toBe(true);
      expect(Array.isArray(result.technicalAnalysis?.resistanceLevels)).toBe(true);

      // Verify entry/exit recommendations
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    }, 30000);

    it('should assess market conditions and sentiment', async () => {
      const result = await mcpService.performTradingToolsAnalysis(
        {
          action: 'market_conditions',
          symbol: 'BNBUSDT',
          currentPrice: 300,
          marketData: {
            volatilityIndex: 0.25,
            tradingVolume: 5000000,
            openInterest: 1200000,
            fundingRate: 0.01,
          },
        },
        'standard'
      );

      expect(result.success).toBe(true);
      expect(result.toolType).toBe('market_conditions');

      // Verify market conditions analysis
      expect(result.marketConditions).toBeDefined();
      expect(result.marketConditions?.sentiment).toMatch(/^(bullish|bearish|neutral)$/);
      expect(result.marketConditions?.volatilityLevel).toMatch(/^(low|medium|high|extreme)$/);
      expect(result.marketConditions?.liquidityScore).toBeGreaterThanOrEqual(0);
      expect(result.marketConditions?.liquidityScore).toBeLessThanOrEqual(1);

      // Verify trend analysis
      expect(result.marketConditions?.trendStrength).toBeGreaterThanOrEqual(0);
      expect(result.marketConditions?.trendStrength).toBeLessThanOrEqual(1);
      expect(result.marketConditions?.timeframeBias).toBeDefined();

      // Verify recommendations
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    }, 30000);

    it('should handle stop loss and take profit calculations', async () => {
      const result = await mcpService.performTradingToolsAnalysis(
        {
          action: 'stop_loss',
          symbol: 'ADAUSDT',
          entryPrice: 0.5,
          currentPrice: 0.52,
          positionSize: 10000,
          riskTolerance: 'moderate',
          timeframe: '1h',
        },
        'quick'
      );

      expect(result.success).toBe(true);
      expect(result.toolType).toBe('stop_loss');

      // Verify risk management calculations
      expect(result.riskManagement).toBeDefined();
      expect(result.riskManagement?.stopLossPrice).toBeTypeOf('number');
      expect(result.riskManagement?.stopLossPrice).toBeLessThan(0.52);
      expect(result.riskManagement?.takeProfitPrice).toBeTypeOf('number');
      expect(result.riskManagement?.takeProfitPrice).toBeGreaterThan(0.52);
      expect(result.riskManagement?.riskRewardRatio).toBeGreaterThan(0);
    }, 15000);

    it('should calculate risk-reward ratios accurately', async () => {
      const result = await mcpService.performTradingToolsAnalysis(
        {
          action: 'risk_reward',
          symbol: 'SOLUSDT',
          entryPrice: 100,
          stopLossPrice: 95,
          takeProfitPrice: 110,
          positionSize: 100,
          timeframe: '15m',
        },
        'quick'
      );

      expect(result.success).toBe(true);
      expect(result.toolType).toBe('risk_reward');

      // Verify risk-reward calculations
      expect(result.riskManagement).toBeDefined();
      expect(result.riskManagement?.riskRewardRatio).toBeCloseTo(2, 1); // (110-100)/(100-95) = 2
      expect(result.riskManagement?.riskAmount).toBeCloseTo(500, 0); // 100 * (100-95)
      expect(result.riskManagement?.potentialProfit).toBeCloseTo(1000, 0); // 100 * (110-100)
    }, 15000);

    it('should provide different analysis depths correctly', async () => {
      const depths: Array<'quick' | 'standard' | 'comprehensive' | 'deep'> = [
        'quick',
        'standard',
        'comprehensive',
        'deep',
      ];

      for (const depth of depths) {
        const result = await mcpService.performTradingToolsAnalysis(
          {
            action: 'position_sizing',
            symbol: 'BTCUSDT',
            accountBalance: 10000,
            riskPerTrade: 0.02,
            entryPrice: 50000,
            currentPrice: 50000,
          },
          depth
        );

        expect(result.success).toBe(true);
        expect(result.modelVersion).toBe('gemini-2.5-flash-preview-05-20');

        // Token usage should vary with depth
        if (result.tokenUsage) {
          expect(result.tokenUsage.totalTokens).toBeGreaterThan(0);
          expect(result.tokenUsage.estimatedCostUSD).toBeGreaterThanOrEqual(0);
        }
      }
    }, 60000);

    it('should handle error cases gracefully', async () => {
      const invalidData = {
        action: 'position_sizing' as const,
        symbol: '',
        accountBalance: -1000, // Invalid negative balance
        riskPerTrade: 2, // Invalid risk > 100%
      };

      const result = await mcpService.performTradingToolsAnalysis(invalidData, 'quick');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });
  });

  describe('Integration Service Trading Tools', () => {
    it('should successfully execute position sizing through integration layer', async () => {
      const result = await mcpIntegrationService.tradingTools(validPositionSizingRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.serviceVersion).toBe('mcp-integration-v1.0');
      expect(result.processingTimeMs).toBeGreaterThan(0);

      if (result.data) {
        expect(result.data.toolType).toBe('position_sizing');
        expect(result.data.confidence).toBeGreaterThanOrEqual(0);
        expect(result.data.positionSizing).toBeDefined();
        expect(result.data.riskManagement).toBeDefined();
      }
    }, 30000);

    it('should handle technical analysis requests', async () => {
      const result = await mcpIntegrationService.tradingTools(validTechnicalAnalysisRequest);

      expect(result.success).toBe(true);
      expect(result.data?.toolType).toBe('technical_analysis');
      expect(result.data?.technicalAnalysis).toBeDefined();
      expect(result.data?.recommendations).toBeDefined();
    }, 30000);

    it('should handle market conditions assessment', async () => {
      const result = await mcpIntegrationService.tradingTools(validMarketConditionsRequest);

      expect(result.success).toBe(true);
      expect(result.data?.toolType).toBe('market_conditions');
      expect(result.data?.marketConditions).toBeDefined();
    }, 30000);

    it('should validate request parameters correctly', async () => {
      const invalidRequests = [
        { ...validPositionSizingRequest, symbol: '' },
        { ...validPositionSizingRequest, accountBalance: -1000 },
        { ...validPositionSizingRequest, action: 'invalid_action' as any },
        { ...validPositionSizingRequest, riskPerTrade: 2 },
      ];

      for (const invalidRequest of invalidRequests) {
        const result = await mcpIntegrationService.tradingTools(invalidRequest);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it('should handle different trading actions correctly', async () => {
      const actions: Array<
        'position_sizing' | 'stop_loss' | 'take_profit' | 'risk_reward' | 'technical_analysis'
      > = ['position_sizing', 'stop_loss', 'take_profit', 'risk_reward', 'technical_analysis'];

      for (const action of actions) {
        const request = {
          ...validPositionSizingRequest,
          action,
        };

        const result = await mcpIntegrationService.tradingTools(request);
        expect(result.success).toBe(true);
        expect(result.data?.toolType).toBe(action);
      }
    }, 60000);

    it('should include MEXC-specific optimizations', async () => {
      const result = await mcpIntegrationService.tradingTools({
        ...validPositionSizingRequest,
        mexcFeatures: {
          utilize0Fees: true,
          considerLeverage: true,
          maxLeverage: 125,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.mexcAdvantages).toBeDefined();

      // Should leverage MEXC's 0% fees in calculations
      if (result.data?.mexcAdvantages) {
        expect(result.data.mexcAdvantages.feeSavingsImpact).toBeGreaterThanOrEqual(0);
      }
    }, 30000);
  });

  describe('Performance and Error Handling', () => {
    it('should complete trading tools analysis within reasonable time limits', async () => {
      const startTime = Date.now();

      const result = await mcpService.performTradingToolsAnalysis(
        {
          action: 'position_sizing',
          symbol: 'BTCUSDT',
          accountBalance: 10000,
          riskPerTrade: 0.02,
          entryPrice: 50000,
          currentPrice: 50000,
        },
        'quick'
      );

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds for quick analysis
      expect(result.success).toBe(true);
    });

    it('should provide fallback results on AI service failures', async () => {
      // Test error handling structure exists
      const invalidData = {
        action: 'position_sizing' as const,
        symbol: 'INVALID',
        accountBalance: 0,
      };

      const result = await mcpService.performTradingToolsAnalysis(invalidData, 'quick');

      // Should still return a structured response even on failure
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');

      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });

    it('should include token usage and cost estimates', async () => {
      const result = await mcpService.performTradingToolsAnalysis(
        {
          action: 'technical_analysis',
          symbol: 'ETHUSDT',
          currentPrice: 3200,
        },
        'standard'
      );

      expect(result.success).toBe(true);

      if (result.tokenUsage) {
        expect(result.tokenUsage.promptTokens).toBeGreaterThan(0);
        expect(result.tokenUsage.completionTokens).toBeGreaterThan(0);
        expect(result.tokenUsage.totalTokens).toBeGreaterThan(0);
        expect(result.tokenUsage.estimatedCostUSD).toBeGreaterThan(0);

        // Verify cost calculation accuracy (Gemini 2.5 Flash pricing)
        const expectedCost = (result.tokenUsage.totalTokens / 1_000_000) * 0.00075;
        expect(Math.abs(result.tokenUsage.estimatedCostUSD! - expectedCost)).toBeLessThan(0.0001);
      }
    }, 30000);
  });

  describe('Integration with Service Info', () => {
    it('should reflect trading tools in service capabilities', async () => {
      const serviceInfo = mcpIntegrationService.getServiceInfo();

      expect(serviceInfo.success).toBe(true);
      expect(serviceInfo.data?.availableEndpoints).toContain('tradingTools');
      expect(serviceInfo.data?.implementedFeatures).toContain('Trading Tools (Task #28)');
      expect(serviceInfo.data?.pendingFeatures).not.toContain('Trading Tools (Task #28)');
    });
  });
});
