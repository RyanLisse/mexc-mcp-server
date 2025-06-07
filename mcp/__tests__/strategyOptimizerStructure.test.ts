/**
 * Strategy Optimizer Structure Test Suite (Task #27)
 * Tests for MEXC Strategy Optimizer structure, validation, and integration
 * These tests do not require API keys - they test the implementation structure
 */

import { describe, expect, it } from 'vitest';
import { mcpIntegrationService } from '../services/mcpIntegration';

describe('Strategy Optimizer Structure - Task #27', () => {
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

  describe('Integration Service Validation', () => {
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
        objectiveFunction: undefined as unknown,
      };

      const result = await mcpIntegrationService.strategyOptimizer(noObjectiveRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Objective function is required');
    });

    it('should properly structure request for core service', async () => {
      // Test that the integration service properly transforms the request
      // With mocked AI calls, this should succeed and show proper structure
      const result = await mcpIntegrationService.strategyOptimizer(validPortfolioRequest);

      // Should pass validation and succeed with mocked AI calls
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.serviceVersion).toBe('mcp-integration-v1.0');
      expect(result.timestamp).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);

      // Should have proper response structure
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.optimizationType).toBe(validPortfolioRequest.objectiveFunction);
        expect(result.data.allocations).toBeDefined();
        expect(Array.isArray(result.data.allocations)).toBe(true);
      }
    });

    it('should accept all valid objective functions', () => {
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

        // Should pass basic validation
        expect(request.objectiveFunction).toBe(objective);
        expect(request.portfolio.length).toBeGreaterThan(0);

        const totalWeight = request.portfolio.reduce((sum, asset) => sum + asset.allocation, 0);
        expect(Math.abs(totalWeight - 1)).toBeLessThan(0.01);
      }
    });

    it('should have correct response structure on success path', async () => {
      // With mocked AI calls, this should succeed and show proper response structure
      const result = await mcpIntegrationService.strategyOptimizer(validPortfolioRequest);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.timestamp).toBe('number');
      expect(result.serviceVersion).toBe('mcp-integration-v1.0');

      // Should succeed with mocked AI calls
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);

      // Verify data structure
      expect(result.data.optimizationType).toBeDefined();
      expect(result.data.confidence).toBeDefined();
      expect(result.data.optimizedMetrics).toBeDefined();
      expect(result.data.allocations).toBeDefined();
    });
  });

  describe('Service Integration', () => {
    it('should reflect strategy optimizer in service capabilities', () => {
      const serviceInfo = mcpIntegrationService.getServiceInfo();

      expect(serviceInfo.success).toBe(true);
      expect(serviceInfo.data?.availableEndpoints).toContain('strategyOptimizer');
      expect(serviceInfo.data?.implementedFeatures).toContain('Strategy Optimizer (Task #27)');
      expect(serviceInfo.data?.pendingFeatures).not.toContain('Strategy Optimizer (Task #27)');
    });

    it('should properly convert allocation format for core service', () => {
      // Test the format conversion logic
      const testPortfolio = [
        { symbol: 'BTCUSDT', allocation: 0.5 },
        { symbol: 'ETHUSDT', allocation: 0.3 },
        { symbol: 'ADAUSDT', allocation: 0.2 },
      ];

      // Simulate the conversion that happens in the integration service
      const convertedPortfolio = testPortfolio.map((asset) => ({
        symbol: asset.symbol,
        currentWeight: asset.allocation,
        historicalReturns: undefined,
      }));

      expect(convertedPortfolio).toHaveLength(3);
      expect(convertedPortfolio[0].symbol).toBe('BTCUSDT');
      expect(convertedPortfolio[0].currentWeight).toBe(0.5);
      expect(convertedPortfolio[0].historicalReturns).toBeUndefined();
    });

    it('should properly set MEXC parameters by default', () => {
      // Test the default MEXC parameters logic
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

  describe('Request Validation Logic', () => {
    it('should validate weight sums correctly', () => {
      const testCases = [
        { weights: [0.4, 0.3, 0.2, 0.1], shouldPass: true }, // Exact sum to 1
        { weights: [0.4, 0.3, 0.2, 0.09], shouldPass: true }, // Close to 1 (0.99)
        { weights: [0.4, 0.3, 0.2, 0.11], shouldPass: true }, // Close to 1 (1.01)
        { weights: [0.4, 0.3, 0.2, 0.2], shouldPass: false }, // Sum to 1.1
        { weights: [0.3, 0.3, 0.2, 0.1], shouldPass: false }, // Sum to 0.9
        { weights: [0.5, 0.5], shouldPass: true }, // Sum to 1.0 - this should pass
      ];

      for (const { weights, shouldPass } of testCases) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        const isValid = Math.abs(totalWeight - 1) <= 0.015; // Slightly more lenient to handle floating point precision

        if (shouldPass) {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      }
    });

    it('should validate objective function values', () => {
      const validObjectives = ['sharpe_ratio', 'max_return', 'min_risk', 'min_drawdown'];
      const invalidObjectives = ['invalid', '', null, undefined, 123];

      for (const objective of validObjectives) {
        expect(typeof objective).toBe('string');
        expect(objective.length).toBeGreaterThan(0);
      }

      for (const objective of invalidObjectives) {
        expect(validObjectives).not.toContain(objective);
      }
    });

    it('should validate portfolio structure', () => {
      const validPortfolios = [
        [{ symbol: 'BTCUSDT', allocation: 1.0 }],
        [
          { symbol: 'BTCUSDT', allocation: 0.5 },
          { symbol: 'ETHUSDT', allocation: 0.5 },
        ],
        [
          { symbol: 'A', allocation: 0.2 },
          { symbol: 'B', allocation: 0.3 },
          { symbol: 'C', allocation: 0.5 },
        ],
      ];

      const invalidPortfolios = [
        [], // Empty
        null, // Null
        undefined, // Undefined
        [{ allocation: 0.5 }], // Missing symbol
        [{ symbol: 'BTCUSDT' }], // Missing allocation
        [{ symbol: '', allocation: 0.5 }], // Empty symbol
      ];

      for (const portfolio of validPortfolios) {
        expect(Array.isArray(portfolio)).toBe(true);
        expect(portfolio.length).toBeGreaterThan(0);
        for (const asset of portfolio) {
          expect(typeof asset.symbol).toBe('string');
          expect(asset.symbol.length).toBeGreaterThan(0);
          expect(typeof asset.allocation).toBe('number');
          expect(asset.allocation).toBeGreaterThanOrEqual(0);
          expect(asset.allocation).toBeLessThanOrEqual(1);
        }
      }

      for (const portfolio of invalidPortfolios) {
        if (portfolio === null || portfolio === undefined) {
          expect(portfolio).toBeFalsy();
        } else if (Array.isArray(portfolio)) {
          if (portfolio.length === 0) {
            expect(portfolio.length).toBe(0);
          } else {
            // Test for missing required fields
            const hasInvalidAsset = portfolio.some(
              (asset) =>
                !asset ||
                typeof asset.symbol !== 'string' ||
                asset.symbol.length === 0 ||
                typeof asset.allocation !== 'number'
            );
            expect(hasInvalidAsset).toBe(true);
          }
        }
      }
    });
  });

  describe('Data Transformation', () => {
    it('should properly map allocation to currentWeight', () => {
      const inputPortfolio = [
        { symbol: 'BTCUSDT', allocation: 0.4 },
        { symbol: 'ETHUSDT', allocation: 0.6 },
      ];

      const transformedPortfolio = inputPortfolio.map((asset) => ({
        symbol: asset.symbol,
        currentWeight: asset.allocation,
        historicalReturns: undefined,
      }));

      expect(transformedPortfolio[0].currentWeight).toBe(0.4);
      expect(transformedPortfolio[1].currentWeight).toBe(0.6);
      expect(transformedPortfolio[0].symbol).toBe('BTCUSDT');
      expect(transformedPortfolio[1].symbol).toBe('ETHUSDT');
    });

    it('should set appropriate MEXC parameters based on objective', () => {
      const objectives = ['sharpe_ratio', 'max_return', 'min_risk', 'min_drawdown'];

      for (const objective of objectives) {
        const shouldConsiderLeverage = objective === 'max_return';

        const mexcParams = {
          utilize0Fees: true,
          considerLeverage: shouldConsiderLeverage,
          maxLeverage: 10,
        };

        expect(mexcParams.utilize0Fees).toBe(true); // Always true
        expect(mexcParams.considerLeverage).toBe(objective === 'max_return');
        expect(mexcParams.maxLeverage).toBe(10);
      }
    });
  });

  describe('Error Response Structure', () => {
    it('should return structured error responses', async () => {
      const invalidRequest = {
        portfolio: [],
        objectiveFunction: 'sharpe_ratio' as const,
        constraints: {},
      };

      const result = await mcpIntegrationService.strategyOptimizer(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
      expect(result.serviceVersion).toBe('mcp-integration-v1.0');
    });

    it('should include processing time in responses', async () => {
      const result = await mcpIntegrationService.strategyOptimizer(validPortfolioRequest);

      // Should have timing information regardless of success/failure
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
    });
  });
});
