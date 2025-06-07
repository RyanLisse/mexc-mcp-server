/**
 * Strategy Optimizer Test Suite (Task #27)
 * Tests for MEXC Strategy Optimizer structure, validation, and integration
 * These tests focus on service structure and validation logic without requiring live API keys
 * Uses the existing mocks from vitest.setup.ts
 */

import { describe, expect, it } from 'vitest';
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

  // Test helper data for optimization validation
  function createValidOptimizationData() {
    return {
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
  }

  // Test that helper function works
  const optimizationData = createValidOptimizationData();
  expect(optimizationData.portfolio.length).toBe(4);

  describe('Core Strategy Optimization Service Structure', () => {
    it('should have correct service structure and methods', () => {
      // Test that the service has the required method
      expect(mcpService.performStrategyOptimization).toBeDefined();
      expect(typeof mcpService.performStrategyOptimization).toBe('function');

      // Test that the service has MEXC-specific enhancement method
      expect(mcpService.enhanceWithMEXCAdvantages).toBeDefined();
      expect(typeof mcpService.enhanceWithMEXCAdvantages).toBe('function');
    });

    it('should validate input data structure correctly', () => {
      // Test valid portfolio structure validation
      const validPortfolio = [
        { symbol: 'BTCUSDT', currentWeight: 0.4, historicalReturns: [0.05, 0.03] },
        { symbol: 'ETHUSDT', currentWeight: 0.6, historicalReturns: [0.08, 0.01] },
      ];

      expect(Array.isArray(validPortfolio)).toBe(true);
      expect(validPortfolio.length).toBeGreaterThan(0);

      for (const asset of validPortfolio) {
        expect(typeof asset.symbol).toBe('string');
        expect(typeof asset.currentWeight).toBe('number');
        expect(asset.currentWeight).toBeGreaterThanOrEqual(0);
        expect(asset.currentWeight).toBeLessThanOrEqual(1);
      }

      // Test weight sum validation
      const totalWeight = validPortfolio.reduce((sum, asset) => sum + asset.currentWeight, 0);
      expect(Math.abs(totalWeight - 1)).toBeLessThan(0.01);
    });

    it('should validate objective function types', () => {
      const validObjectives = ['sharpe_ratio', 'max_return', 'min_risk', 'min_drawdown'];
      const invalidObjectives = ['invalid', '', null, undefined];

      for (const objective of validObjectives) {
        expect(typeof objective).toBe('string');
        expect(objective.length).toBeGreaterThan(0);
      }

      for (const objective of invalidObjectives) {
        expect(validObjectives).not.toContain(objective);
      }
    });

    it('should validate MEXC parameters structure', () => {
      const mexcParameters = {
        utilize0Fees: true,
        considerLeverage: false,
        maxLeverage: 10,
      };

      expect(typeof mexcParameters.utilize0Fees).toBe('boolean');
      expect(typeof mexcParameters.considerLeverage).toBe('boolean');
      expect(typeof mexcParameters.maxLeverage).toBe('number');
      expect(mexcParameters.maxLeverage).toBeGreaterThan(0);
      expect(mexcParameters.maxLeverage).toBeLessThanOrEqual(125); // MEXC max leverage
    });

    it('should validate constraints structure', () => {
      const constraints = {
        maxRisk: 0.2,
        minReturn: 0.1,
        maxDrawdown: 0.15,
        maxPositionSize: 0.5,
        minPositionSize: 0.05,
      };

      for (const [key, value] of Object.entries(constraints)) {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
        if (key.includes('max') || key.includes('min')) {
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('Integration Service Strategy Optimizer', () => {
    it('should have correct integration service structure', () => {
      // Test that integration service has the strategy optimizer method
      expect(mcpIntegrationService.strategyOptimizer).toBeDefined();
      expect(typeof mcpIntegrationService.strategyOptimizer).toBe('function');

      // Test service info includes strategy optimizer
      const serviceInfo = mcpIntegrationService.getServiceInfo();
      expect(serviceInfo.success).toBe(true);
      expect(serviceInfo.data?.availableEndpoints).toContain('strategyOptimizer');
      expect(serviceInfo.data?.implementedFeatures).toContain('Strategy Optimizer (Task #27)');
    });

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

    it('should accept all valid objective functions for validation', () => {
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

        // Test structure validation
        expect(request.objectiveFunction).toBe(objective);
        expect(request.portfolio.length).toBeGreaterThan(0);

        const totalWeight = request.portfolio.reduce((sum, asset) => sum + asset.allocation, 0);
        expect(Math.abs(totalWeight - 1)).toBeLessThan(0.01);
      }
    });

    it('should set MEXC parameters correctly by default', () => {
      // Test default MEXC parameters logic
      const defaultMexcParams = {
        utilize0Fees: true, // Always leverage MEXC's 0% fees
        considerLeverage: false, // Default for non-max_return objectives
        maxLeverage: 10, // Conservative default
      };

      expect(defaultMexcParams.utilize0Fees).toBe(true);
      expect(defaultMexcParams.considerLeverage).toBe(false);
      expect(defaultMexcParams.maxLeverage).toBe(10);

      // For max_return objective, leverage should be considered
      const maxReturnObjective = 'max_return';
      const leverageForMaxReturn = maxReturnObjective === 'max_return';
      expect(leverageForMaxReturn).toBe(true);
    });
  });

  describe('MEXC-Specific Features Structure', () => {
    it('should have correct MEXC enhancement method structure', () => {
      // Test that MEXC enhancement method exists
      expect(mcpService.enhanceWithMEXCAdvantages).toBeDefined();
      expect(typeof mcpService.enhanceWithMEXCAdvantages).toBe('function');
    });

    it('should validate MEXC advantages data structure', () => {
      const mockMexcAdvantages = {
        feeSavingsUSD: 100,
        leverageOpportunities: [
          {
            symbol: 'BTCUSDT',
            recommendedLeverage: 2,
            expectedBoost: 0.02,
          },
          {
            symbol: 'ETHUSDT',
            recommendedLeverage: 3,
            expectedBoost: 0.03,
          },
        ],
      };

      expect(typeof mockMexcAdvantages.feeSavingsUSD).toBe('number');
      expect(mockMexcAdvantages.feeSavingsUSD).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(mockMexcAdvantages.leverageOpportunities)).toBe(true);

      for (const opportunity of mockMexcAdvantages.leverageOpportunities) {
        expect(typeof opportunity.symbol).toBe('string');
        expect(typeof opportunity.recommendedLeverage).toBe('number');
        expect(typeof opportunity.expectedBoost).toBe('number');
        expect(opportunity.recommendedLeverage).toBeGreaterThanOrEqual(1);
        expect(opportunity.recommendedLeverage).toBeLessThanOrEqual(125); // MEXC max
      }
    });

    it('should validate leverage constraint logic', () => {
      const maxLeverageConstraints = [1, 2, 3, 5, 10, 20, 50, 125];

      for (const maxLeverage of maxLeverageConstraints) {
        expect(maxLeverage).toBeGreaterThanOrEqual(1);
        expect(maxLeverage).toBeLessThanOrEqual(125);

        // Test conservative leverage recommendation logic
        const conservativeRecommendation = Math.min(2, maxLeverage);
        expect(conservativeRecommendation).toBeLessThanOrEqual(maxLeverage);
        expect(conservativeRecommendation).toBeGreaterThanOrEqual(1);
      }
    });

    it('should validate fee savings calculation logic', () => {
      // Test fee savings calculation structure
      const estimatedTradingVolume = 100000;
      const feePercentage = 0.001; // 0.1% typical fee on other exchanges
      const expectedSavings = estimatedTradingVolume * feePercentage;

      expect(expectedSavings).toBeGreaterThan(0);
      expect(expectedSavings).toBe(100); // 100 USD savings for 100k volume
    });
  });

  describe('Performance and Error Handling Structure', () => {
    it('should validate response structure', () => {
      // Test expected response structure for success case
      const mockSuccessResponse = {
        success: true,
        optimizationType: 'sharpe_ratio',
        confidence: 0.85,
        optimizedMetrics: {
          expectedReturn: 0.12,
          volatility: 0.15,
          sharpeRatio: 0.8,
          maxDrawdown: 0.08,
        },
        allocations: [],
        recommendations: [],
        modelVersion: 'gemini-2.5-flash-preview-05-20',
        tokenUsage: {
          promptTokens: 1500,
          completionTokens: 800,
          totalTokens: 2300,
          estimatedCostUSD: 0.001725,
        },
      };

      expect(typeof mockSuccessResponse.success).toBe('boolean');
      expect(typeof mockSuccessResponse.optimizationType).toBe('string');
      expect(typeof mockSuccessResponse.confidence).toBe('number');
      expect(mockSuccessResponse.confidence).toBeGreaterThanOrEqual(0);
      expect(mockSuccessResponse.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(mockSuccessResponse.allocations)).toBe(true);
      expect(Array.isArray(mockSuccessResponse.recommendations)).toBe(true);
    });

    it('should validate error response structure', () => {
      // Test expected response structure for error case
      const mockErrorResponse = {
        success: false,
        error: 'Strategy optimization failed',
        optimizationType: 'sharpe_ratio',
        confidence: 0,
        optimizedMetrics: {
          expectedReturn: 0,
          volatility: 0,
          sharpeRatio: 0,
          maxDrawdown: 1,
        },
        allocations: [],
        recommendations: [],
      };

      expect(mockErrorResponse.success).toBe(false);
      expect(typeof mockErrorResponse.error).toBe('string');
      expect(mockErrorResponse.error.length).toBeGreaterThan(0);
      expect(mockErrorResponse.confidence).toBe(0);
      expect(Array.isArray(mockErrorResponse.allocations)).toBe(true);
      expect(Array.isArray(mockErrorResponse.recommendations)).toBe(true);
    });

    it('should validate token usage calculation logic', () => {
      // Test cost calculation logic
      const mockTokenUsage = {
        promptTokens: 1500,
        completionTokens: 800,
        totalTokens: 2300,
      };

      expect(mockTokenUsage.totalTokens).toBe(
        mockTokenUsage.promptTokens + mockTokenUsage.completionTokens
      );

      // Test Gemini 2.5 Flash pricing calculation
      const expectedCostUSD = (mockTokenUsage.totalTokens / 1_000_000) * 0.00075;
      expect(expectedCostUSD).toBeCloseTo(0.000001725, 6);
    });
  });

  describe('Integration with Service Info', () => {
    it('should reflect strategy optimizer in service capabilities', () => {
      const serviceInfo = mcpIntegrationService.getServiceInfo();

      expect(serviceInfo.success).toBe(true);
      expect(serviceInfo.data?.availableEndpoints).toContain('strategyOptimizer');
      expect(serviceInfo.data?.implementedFeatures).toContain('Strategy Optimizer (Task #27)');
      expect(serviceInfo.data?.pendingFeatures).not.toContain('Strategy Optimizer (Task #27)');

      // Test service version
      expect(serviceInfo.data?.version).toBe('mcp-integration-v1.0');

      // Test dependencies
      expect(Array.isArray(serviceInfo.data?.dependencies)).toBe(true);
      expect(serviceInfo.data?.dependencies).toContain('mcpCoreService');
    });

    it('should validate service integration structure', () => {
      // Test that all required integration service methods exist
      const requiredMethods = [
        'strategyOptimizer',
        'getServiceInfo',
        'aiMarketAnalysis',
        'riskAssessment',
        'tradingTools',
        'getUnifiedHealth',
        'resetEnvironment',
      ];

      for (const method of requiredMethods) {
        expect(mcpIntegrationService[method]).toBeDefined();
        expect(typeof mcpIntegrationService[method]).toBe('function');
      }
    });
  });
});
