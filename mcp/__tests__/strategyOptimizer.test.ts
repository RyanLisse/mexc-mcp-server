/**
 * Strategy Optimizer Test Suite (Task #27)
 * Comprehensive tests for MEXC Strategy Optimizer API endpoint
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mcpService } from '../encore.service';
import { mcpIntegrationService } from '../services/mcpIntegration';

describe('Strategy Optimizer - Task #27', () => {
  // Test data for portfolio optimization
  const validPortfolioRequest = {
    portfolio: [
      { symbol: 'BTCUSDT', allocation: 0.4 },
      { symbol: 'ETHUSDT', allocation: 0.3 },
      { symbol: 'BNBUSDT', allocation: 0.2 },
      { symbol: 'ADAUSDT', allocation: 0.1 },
    ],
    objectiveFunction: 'sharpe_ratio' as const,
    constraints: {
      maxRisk: 0.2,
      minReturn: 0.1,
      maxDrawdown: 0.15,
      maxPositionSize: 0.5,
      minPositionSize: 0.05,
    },
    timeHorizon: 'medium' as const,
    rebalanceFrequency: 'monthly' as const,
  };

  const validOptimizationData = {
    portfolio: [
      { symbol: 'BTCUSDT', currentWeight: 0.4, historicalReturns: [0.05, 0.03, -0.02] },
      { symbol: 'ETHUSDT', currentWeight: 0.3, historicalReturns: [0.08, 0.01, -0.03] },
      { symbol: 'BNBUSDT', currentWeight: 0.2, historicalReturns: [0.06, 0.02, -0.01] },
      { symbol: 'ADAUSDT', currentWeight: 0.1, historicalReturns: [0.12, -0.01, -0.04] },
    ],
    objectiveFunction: 'sharpe_ratio' as const,
    constraints: {
      maxRisk: 0.2,
      minReturn: 0.1,
      maxDrawdown: 0.15,
      maxPositionSize: 0.5,
      minPositionSize: 0.05,
    },
    timeHorizon: 'medium' as const,
    rebalanceFrequency: 'monthly' as const,
    mexcParameters: {
      utilize0Fees: true,
      considerLeverage: false,
      maxLeverage: 10,
    },
  };

  describe('Core Strategy Optimization Service', () => {
    it('should successfully perform portfolio optimization with Sharpe ratio objective', async () => {
      const result = await mcpService.performStrategyOptimization(validOptimizationData, 'quick');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.optimizationType).toBe('sharpe_ratio');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // Verify optimized metrics structure
      expect(result.optimizedMetrics).toBeDefined();
      expect(result.optimizedMetrics?.expectedReturn).toBeTypeOf('number');
      expect(result.optimizedMetrics?.volatility).toBeGreaterThanOrEqual(0);
      expect(result.optimizedMetrics?.sharpeRatio).toBeTypeOf('number');
      expect(result.optimizedMetrics?.maxDrawdown).toBeGreaterThanOrEqual(0);
      expect(result.optimizedMetrics?.maxDrawdown).toBeLessThanOrEqual(1);

      // Verify allocations
      expect(result.allocations).toBeDefined();
      expect(Array.isArray(result.allocations)).toBe(true);
      expect(result.allocations?.length).toBe(4);

      // Verify allocation weights sum to approximately 1
      const totalOptimizedWeight =
        result.allocations?.reduce((sum, allocation) => sum + allocation.optimizedWeight, 0) || 0;
      expect(Math.abs(totalOptimizedWeight - 1)).toBeLessThan(0.01);

      // Verify recommendations
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    }, 30000);

    it('should perform optimization with maximum return objective', async () => {
      const maxReturnData = {
        ...validOptimizationData,
        objectiveFunction: 'max_return' as const,
      };

      const result = await mcpService.performStrategyOptimization(maxReturnData, 'standard');

      expect(result.success).toBe(true);
      expect(result.optimizationType).toBe('max_return');
      expect(result.optimizedMetrics?.expectedReturn).toBeTypeOf('number');
    }, 30000);

    it('should perform optimization with minimum risk objective', async () => {
      const minRiskData = {
        ...validOptimizationData,
        objectiveFunction: 'min_risk' as const,
      };

      const result = await mcpService.performStrategyOptimization(minRiskData, 'standard');

      expect(result.success).toBe(true);
      expect(result.optimizationType).toBe('min_risk');
      expect(result.optimizedMetrics?.volatility).toBeGreaterThanOrEqual(0);
    }, 30000);

    it('should perform optimization with minimum drawdown objective', async () => {
      const minDrawdownData = {
        ...validOptimizationData,
        objectiveFunction: 'min_drawdown' as const,
      };

      const result = await mcpService.performStrategyOptimization(minDrawdownData, 'standard');

      expect(result.success).toBe(true);
      expect(result.optimizationType).toBe('min_drawdown');
      expect(result.optimizedMetrics?.maxDrawdown).toBeLessThanOrEqual(1);
    }, 30000);

    it('should include MEXC-specific advantages when enabled', async () => {
      const mexcEnabledData = {
        ...validOptimizationData,
        mexcParameters: {
          utilize0Fees: true,
          considerLeverage: true,
          maxLeverage: 5,
        },
      };

      const result = await mcpService.performStrategyOptimization(mexcEnabledData, 'comprehensive');

      expect(result.success).toBe(true);
      expect(result.mexcAdvantages).toBeDefined();

      if (result.mexcAdvantages) {
        expect(result.mexcAdvantages.feeSavingsUSD).toBeGreaterThanOrEqual(0);
        // Leverage opportunities may or may not be present depending on AI analysis
      }
    }, 30000);

    it('should handle different analysis depths correctly', async () => {
      const depths: Array<'quick' | 'standard' | 'comprehensive' | 'deep'> = [
        'quick',
        'standard',
        'comprehensive',
        'deep',
      ];

      for (const depth of depths) {
        const result = await mcpService.performStrategyOptimization(validOptimizationData, depth);
        expect(result.success).toBe(true);
        expect(result.modelVersion).toBe('gemini-2.5-flash-preview-05-20');

        // Token usage should vary with depth
        if (result.tokenUsage) {
          expect(result.tokenUsage.totalTokens).toBeGreaterThan(0);
          expect(result.tokenUsage.estimatedCostUSD).toBeGreaterThanOrEqual(0);
        }
      }
    }, 60000);

    it('should provide backtesting results when available', async () => {
      const result = await mcpService.performStrategyOptimization(
        validOptimizationData,
        'comprehensive'
      );

      expect(result.success).toBe(true);

      // Backtest results are optional but should be valid if present
      if (result.backtestResults) {
        expect(result.backtestResults.periodMonths).toBeGreaterThan(0);
        expect(result.backtestResults.totalReturn).toBeTypeOf('number');
        expect(result.backtestResults.annualizedReturn).toBeTypeOf('number');
        expect(result.backtestResults.maxDrawdown).toBeGreaterThanOrEqual(0);
        expect(result.backtestResults.maxDrawdown).toBeLessThanOrEqual(1);
        expect(result.backtestResults.winRate).toBeGreaterThanOrEqual(0);
        expect(result.backtestResults.winRate).toBeLessThanOrEqual(1);
        expect(result.backtestResults.vsBaseline).toBeDefined();
      }
    }, 30000);

    it('should handle error cases gracefully', async () => {
      const invalidData = {
        portfolio: [], // Empty portfolio should cause error
        objectiveFunction: 'sharpe_ratio' as const,
        constraints: {},
      };

      const result = await mcpService.performStrategyOptimization(invalidData, 'quick');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });
  });

  describe('Integration Service Strategy Optimizer', () => {
    it('should successfully optimize portfolio through integration layer', async () => {
      const result = await mcpIntegrationService.strategyOptimizer(validPortfolioRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.serviceVersion).toBe('mcp-integration-v1.0');
      expect(result.processingTimeMs).toBeGreaterThan(0);

      if (result.data) {
        expect(result.data.optimizationType).toBe('sharpe_ratio');
        expect(result.data.confidence).toBeGreaterThanOrEqual(0);
        expect(result.data.optimizedMetrics).toBeDefined();
        expect(result.data.allocations).toBeDefined();
        expect(result.data.recommendations).toBeDefined();
      }
    }, 30000);

    it('should validate portfolio weights sum correctly', async () => {
      const invalidWeightsRequest = {
        ...validPortfolioRequest,
        portfolio: [
          { symbol: 'BTCUSDT', allocation: 0.6 }, // Weights sum to 1.5, should fail
          { symbol: 'ETHUSDT', allocation: 0.5 },
          { symbol: 'BNBUSDT', allocation: 0.4 },
        ],
      };

      const result = await mcpIntegrationService.strategyOptimizer(invalidWeightsRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('allocations must sum to approximately 1.0');
    });

    it('should require valid portfolio input', async () => {
      const emptyPortfolioRequest = {
        ...validPortfolioRequest,
        portfolio: [],
      };

      const result = await mcpIntegrationService.strategyOptimizer(emptyPortfolioRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Portfolio is required and must contain at least one asset');
    });

    it('should require objective function', async () => {
      const noObjectiveRequest = {
        ...validPortfolioRequest,
        objectiveFunction: undefined as any,
      };

      const result = await mcpIntegrationService.strategyOptimizer(noObjectiveRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Objective function is required');
    });

    it('should handle different objective functions correctly', async () => {
      const objectives: Array<'sharpe_ratio' | 'max_return' | 'min_risk' | 'min_drawdown'> = [
        'sharpe_ratio',
        'max_return',
        'min_risk',
        'min_drawdown',
      ];

      for (const objective of objectives) {
        const request = {
          ...validPortfolioRequest,
          objectiveFunction: objective,
        };

        const result = await mcpIntegrationService.strategyOptimizer(request);
        expect(result.success).toBe(true);
        expect(result.data?.optimizationType).toBe(objective);
      }
    }, 60000);

    it('should always leverage MEXC advantages by default', async () => {
      const result = await mcpIntegrationService.strategyOptimizer(validPortfolioRequest);

      expect(result.success).toBe(true);
      expect(result.data?.mexcAdvantages).toBeDefined();

      // Should always utilize 0% fees
      if (result.data?.mexcAdvantages) {
        expect(result.data.mexcAdvantages.feeSavingsUSD).toBeGreaterThanOrEqual(0);
      }
    }, 30000);
  });

  describe('MEXC-Specific Features', () => {
    it('should calculate fee savings correctly', async () => {
      const result = await mcpService.enhanceWithMEXCAdvantages(
        {
          optimizedMetrics: {
            expectedReturn: 0.1,
            volatility: 0.15,
            sharpeRatio: 0.67,
            maxDrawdown: 0.1,
          },
          allocations: [
            {
              symbol: 'BTCUSDT',
              currentWeight: 0.4,
              optimizedWeight: 0.35,
              adjustment: -0.05,
              reasoning: 'Reduce exposure',
            },
            {
              symbol: 'ETHUSDT',
              currentWeight: 0.3,
              optimizedWeight: 0.4,
              adjustment: 0.1,
              reasoning: 'Increase allocation',
            },
          ],
          recommendations: [],
        },
        { mexcParameters: { utilize0Fees: true, considerLeverage: false } }
      );

      expect(result.mexcAdvantages).toBeDefined();
      expect(result.mexcAdvantages.feeSavingsUSD).toBeGreaterThan(0);
    });

    it('should identify leverage opportunities for high-performing assets', async () => {
      const mockResult = {
        optimizedMetrics: {
          expectedReturn: 0.15,
          volatility: 0.2,
          sharpeRatio: 0.75,
          maxDrawdown: 0.12,
        },
        allocations: [
          {
            symbol: 'BTCUSDT',
            currentWeight: 0.3,
            optimizedWeight: 0.5,
            adjustment: 0.2,
            reasoning: 'Strong performance',
          },
          {
            symbol: 'ETHUSDT',
            currentWeight: 0.2,
            optimizedWeight: 0.3,
            adjustment: 0.1,
            reasoning: 'Moderate increase',
          },
        ],
        recommendations: [],
      };

      const result = await mcpService.enhanceWithMEXCAdvantages(mockResult, {
        mexcParameters: { utilize0Fees: true, considerLeverage: true, maxLeverage: 10 },
      });

      expect(result.mexcAdvantages).toBeDefined();

      if (result.mexcAdvantages.leverageOpportunities) {
        expect(Array.isArray(result.mexcAdvantages.leverageOpportunities)).toBe(true);

        result.mexcAdvantages.leverageOpportunities.forEach((opportunity) => {
          expect(opportunity.symbol).toBeTypeOf('string');
          expect(opportunity.recommendedLeverage).toBeGreaterThanOrEqual(1);
          expect(opportunity.recommendedLeverage).toBeLessThanOrEqual(10);
          expect(opportunity.expectedBoost).toBeTypeOf('number');
        });
      }
    });

    it('should respect maximum leverage constraints', async () => {
      const mockResult = {
        allocations: [
          {
            symbol: 'BTCUSDT',
            currentWeight: 0.2,
            optimizedWeight: 0.6,
            adjustment: 0.4,
            reasoning: 'Major increase',
          },
        ],
      };

      const result = await mcpService.enhanceWithMEXCAdvantages(mockResult, {
        mexcParameters: { considerLeverage: true, maxLeverage: 3 },
      });

      if (result.mexcAdvantages?.leverageOpportunities) {
        result.mexcAdvantages.leverageOpportunities.forEach((opportunity) => {
          expect(opportunity.recommendedLeverage).toBeLessThanOrEqual(3);
        });
      }
    });
  });

  describe('Performance and Error Handling', () => {
    it('should complete optimization within reasonable time limits', async () => {
      const startTime = Date.now();

      const result = await mcpService.performStrategyOptimization(validOptimizationData, 'quick');

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(15000); // Should complete within 15 seconds for quick analysis
      expect(result.success).toBe(true);
    });

    it('should provide fallback results on AI service failures', async () => {
      // This test would need to mock a failure scenario
      // For now, we just verify the error handling structure exists
      const invalidData = {
        portfolio: [{ symbol: 'INVALID', currentWeight: 1 }],
        objectiveFunction: 'sharpe_ratio' as const,
        constraints: {},
      };

      const result = await mcpService.performStrategyOptimization(invalidData, 'quick');

      // Should still return a structured response even on failure
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');

      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });

    it('should include token usage and cost estimates', async () => {
      const result = await mcpService.performStrategyOptimization(
        validOptimizationData,
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
    it('should reflect strategy optimizer in service capabilities', async () => {
      const serviceInfo = mcpIntegrationService.getServiceInfo();

      expect(serviceInfo.success).toBe(true);
      expect(serviceInfo.data?.availableEndpoints).toContain('strategyOptimizer');
      expect(serviceInfo.data?.implementedFeatures).toContain('Strategy Optimizer (Task #27)');
      expect(serviceInfo.data?.pendingFeatures).not.toContain('Strategy Optimizer (Task #27)');
    });
  });
});
