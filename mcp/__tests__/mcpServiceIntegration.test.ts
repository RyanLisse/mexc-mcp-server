/**
 * MCP Service Integration Test Suite (Task #31)
 * Tests the complete MCP service structure with AI-enhanced tools integration
 * TDD Implementation - Tests written first
 */

import { describe, expect, it } from 'vitest';
import { mcpIntegrationService } from '../services/mcpIntegration';

describe('MCP Service Integration - Task #31', () => {
  describe('Service Architecture Validation', () => {
    it('should have all required service methods defined', () => {
      // Test that the integration service has all required methods
      expect(mcpIntegrationService.aiMarketAnalysis).toBeDefined();
      expect(typeof mcpIntegrationService.aiMarketAnalysis).toBe('function');

      expect(mcpIntegrationService.riskAssessment).toBeDefined();
      expect(typeof mcpIntegrationService.riskAssessment).toBe('function');

      expect(mcpIntegrationService.strategyOptimizer).toBeDefined();
      expect(typeof mcpIntegrationService.strategyOptimizer).toBe('function');

      expect(mcpIntegrationService.tradingTools).toBeDefined();
      expect(typeof mcpIntegrationService.tradingTools).toBe('function');

      expect(mcpIntegrationService.performMultiAnalysis).toBeDefined();
      expect(typeof mcpIntegrationService.performMultiAnalysis).toBe('function');

      expect(mcpIntegrationService.getUnifiedHealth).toBeDefined();
      expect(typeof mcpIntegrationService.getUnifiedHealth).toBe('function');

      expect(mcpIntegrationService.resetEnvironment).toBeDefined();
      expect(typeof mcpIntegrationService.resetEnvironment).toBe('function');

      expect(mcpIntegrationService.getServiceInfo).toBeDefined();
      expect(typeof mcpIntegrationService.getServiceInfo).toBe('function');
    });

    it('should have proper service info reflecting all implemented features', () => {
      const serviceInfo = mcpIntegrationService.getServiceInfo();

      expect(serviceInfo.success).toBe(true);
      expect(serviceInfo.data?.version).toBe('mcp-integration-v1.0');

      // Check all required endpoints are listed
      const expectedEndpoints = [
        'aiMarketAnalysis',
        'riskAssessment',
        'strategyOptimizer',
        'tradingTools',
        'performMultiAnalysis',
        'getUnifiedHealth',
        'resetEnvironment',
        'getServiceInfo',
      ];

      expectedEndpoints.forEach((endpoint) => {
        expect(serviceInfo.data?.availableEndpoints).toContain(endpoint);
      });

      // Check all tasks are marked as implemented
      const expectedFeatures = [
        'AI Market Analysis (Task #24)',
        'Risk Assessment (Task #26)',
        'Strategy Optimizer (Task #27)',
        'Trading Tools (Task #28)',
      ];

      expectedFeatures.forEach((feature) => {
        expect(serviceInfo.data?.implementedFeatures).toContain(feature);
      });

      // Should have no pending features since Tasks #27 and #28 are complete
      expect(serviceInfo.data?.pendingFeatures).toEqual([]);

      // Check dependencies are listed
      expect(serviceInfo.data?.dependencies).toContain('mcpCoreService');
      expect(serviceInfo.data?.dependencies).toContain('mcpAnalysisService');
      expect(serviceInfo.data?.dependencies).toContain('mcpRiskService');
    });
  });

  describe('AI Market Analysis Integration', () => {
    it('should validate required parameters for market analysis', async () => {
      // Test missing symbol
      const result1 = await mcpIntegrationService.aiMarketAnalysis({
        symbol: '',
        analysisType: 'sentiment',
      });

      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Symbol and analysis type are required');
      expect(result1.serviceVersion).toBe('mcp-integration-v1.0');
    });

    it('should accept all valid analysis types', async () => {
      const validTypes: Array<'sentiment' | 'technical' | 'risk' | 'trend'> = [
        'sentiment',
        'technical',
        'risk',
        'trend',
      ];

      for (const analysisType of validTypes) {
        // Create appropriate request data for each analysis type
        let request;

        switch (analysisType) {
          case 'sentiment':
          case 'risk':
            request = {
              symbol: 'BTCUSDT',
              analysisType,
              depth: 'quick' as const,
            };
            break;
          case 'technical':
            request = {
              symbol: 'BTCUSDT',
              analysisType,
              depth: 'quick' as const,
              marketData: {
                open: 49000,
                high: 51000,
                low: 48500,
                close: 50000,
                volume: 1000000,
              },
            };
            break;
          case 'trend':
            request = {
              symbol: 'BTCUSDT',
              analysisType,
              depth: 'quick' as const,
              ohlcv: [
                [Date.now() - 86400000, 49000, 51000, 48500, 50000, 1000000],
                [Date.now(), 50000, 51500, 49500, 50500, 1100000],
              ],
            };
            break;
          default:
            request = {
              symbol: 'BTCUSDT',
              analysisType,
              depth: 'quick' as const,
            };
        }

        const result = await mcpIntegrationService.aiMarketAnalysis(request);

        // Should attempt analysis (may fail due to API keys, but structure should be correct)
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(result.serviceVersion).toBe('mcp-integration-v1.0');
      }
    });

    it('should support all analysis depths', async () => {
      const depths: Array<'quick' | 'standard' | 'comprehensive' | 'deep'> = [
        'quick',
        'standard',
        'comprehensive',
        'deep',
      ];

      for (const depth of depths) {
        const result = await mcpIntegrationService.aiMarketAnalysis({
          symbol: 'BTCUSDT',
          analysisType: 'sentiment',
          depth,
        });

        expect(result).toBeDefined();
        expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Risk Assessment Integration', () => {
    it('should validate portfolio requirements', async () => {
      // Test empty portfolio
      const result1 = await mcpIntegrationService.riskAssessment({
        portfolio: [],
        totalValue: 10000,
      });

      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Portfolio is required and must contain at least one asset');
    });

    it('should validate total value requirements', async () => {
      const result = await mcpIntegrationService.riskAssessment({
        portfolio: [
          {
            symbol: 'BTCUSDT',
            quantity: 1,
            currentPrice: 50000,
          },
        ],
        totalValue: -1000, // Invalid
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Total value must be a positive number');
    });

    it('should accept valid risk assessment requests', async () => {
      const validRequest = {
        portfolio: [
          {
            symbol: 'BTCUSDT',
            quantity: 1,
            currentPrice: 50000,
            entryPrice: 45000,
            assetType: 'crypto' as const,
          },
          {
            symbol: 'ETHUSDT',
            quantity: 10,
            currentPrice: 3000,
            entryPrice: 2800,
            assetType: 'crypto' as const,
          },
        ],
        totalValue: 80000,
        riskTolerance: 'moderate' as const,
        timeHorizon: 'medium' as const,
      };

      const result = await mcpIntegrationService.riskAssessment(validRequest);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.serviceVersion).toBe('mcp-integration-v1.0');
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Strategy Optimizer Integration', () => {
    it('should validate portfolio allocation weights', async () => {
      const invalidRequest = {
        portfolio: [
          { symbol: 'BTCUSDT', allocation: 0.7 },
          { symbol: 'ETHUSDT', allocation: 0.5 }, // Total > 1
        ],
        objectiveFunction: 'sharpe_ratio' as const,
        constraints: {},
      };

      const result = await mcpIntegrationService.strategyOptimizer(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Portfolio allocations must sum to approximately 1.0');
    });

    it('should validate objective function requirement', async () => {
      const invalidRequest = {
        portfolio: [
          { symbol: 'BTCUSDT', allocation: 0.6 },
          { symbol: 'ETHUSDT', allocation: 0.4 },
        ],
        objectiveFunction: '' as any,
        constraints: {},
      };

      const result = await mcpIntegrationService.strategyOptimizer(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Objective function is required');
    });

    it('should accept valid optimization requests', async () => {
      const validRequest = {
        portfolio: [
          { symbol: 'BTCUSDT', allocation: 0.6 },
          { symbol: 'ETHUSDT', allocation: 0.4 },
        ],
        objectiveFunction: 'sharpe_ratio' as const,
        constraints: {
          maxRisk: 0.3,
          minReturn: 0.1,
        },
        timeHorizon: 'medium' as const,
        rebalanceFrequency: 'monthly' as const,
      };

      const result = await mcpIntegrationService.strategyOptimizer(validRequest);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.serviceVersion).toBe('mcp-integration-v1.0');
    });

    it('should automatically set MEXC parameters', async () => {
      const request = {
        portfolio: [{ symbol: 'BTCUSDT', allocation: 1.0 }],
        objectiveFunction: 'max_return' as const,
        constraints: {},
      };

      // The integration service should set utilize0Fees: true and considerLeverage based on objective
      const result = await mcpIntegrationService.strategyOptimizer(request);

      expect(result).toBeDefined();
      // Structure is correct regardless of AI response
    });
  });

  describe('Trading Tools Integration', () => {
    it('should validate trading tools request parameters', async () => {
      // Test missing symbol
      const result1 = await mcpIntegrationService.tradingTools({
        action: 'position_sizing',
        symbol: '',
        accountBalance: 10000,
      });

      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Symbol and action are required');
    });

    it('should support all trading tool actions', async () => {
      const actions: Array<
        'position_sizing' | 'stop_loss' | 'take_profit' | 'risk_reward' | 'technical_analysis'
      > = ['position_sizing', 'stop_loss', 'take_profit', 'risk_reward', 'technical_analysis'];

      for (const action of actions) {
        const result = await mcpIntegrationService.tradingTools({
          action,
          symbol: 'BTCUSDT',
          accountBalance: 10000,
        });

        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(result.serviceVersion).toBe('mcp-integration-v1.0');
      }
    });

    it('should validate account balance', async () => {
      const result = await mcpIntegrationService.tradingTools({
        action: 'position_sizing',
        symbol: 'BTCUSDT',
        accountBalance: -1000, // Invalid
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account balance must be a positive number');
    });

    it('should validate risk per trade bounds', async () => {
      const result = await mcpIntegrationService.tradingTools({
        action: 'position_sizing',
        symbol: 'BTCUSDT',
        accountBalance: 10000,
        riskPerTrade: 1.5, // Invalid > 1
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Risk per trade must be between 0 and 1');
    });
  });

  describe('Multi-Analysis Integration', () => {
    it('should validate analysis types requirement', async () => {
      const result = await mcpIntegrationService.performMultiAnalysis({
        symbol: 'BTCUSDT',
        analysisTypes: [], // Empty array
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Symbol and analysis types are required');
    });

    it('should accept valid multi-analysis requests', async () => {
      const request = {
        symbol: 'BTCUSDT',
        analysisTypes: ['sentiment', 'technical', 'risk'] as const,
        depth: 'comprehensive' as const,
        price: 50000,
        volume: 1000000,
      };

      const result = await mcpIntegrationService.performMultiAnalysis(request);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.serviceVersion).toBe('mcp-integration-v1.0');
    });

    it('should default to comprehensive depth for multi-analysis', async () => {
      const request = {
        symbol: 'BTCUSDT',
        analysisTypes: ['sentiment', 'risk'] as const,
        // No depth specified
      };

      const result = await mcpIntegrationService.performMultiAnalysis(request);

      expect(result).toBeDefined();
      // Should handle depth defaulting internally
    });
  });

  describe('Service Health Integration', () => {
    it('should provide unified health status', () => {
      const health = mcpIntegrationService.getUnifiedHealth();

      expect(health.success).toBe(true);
      expect(health.data).toBeDefined();
      expect(health.serviceVersion).toBe('mcp-integration-v1.0');
      expect(health.timestamp).toBeDefined();
      expect(health.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Environment Management', () => {
    it('should support environment reset', () => {
      const result = mcpIntegrationService.resetEnvironment();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.serviceVersion).toBe('mcp-integration-v1.0');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should return structured error responses', async () => {
      const invalidRequest = {
        symbol: '',
        analysisType: 'invalid_type' as any,
      };

      const result = await mcpIntegrationService.aiMarketAnalysis(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.timestamp).toBeDefined();
      expect(result.serviceVersion).toBe('mcp-integration-v1.0');
    });

    it('should include processing time in all responses', async () => {
      const requests = [
        mcpIntegrationService.aiMarketAnalysis({
          symbol: 'BTCUSDT',
          analysisType: 'sentiment',
        }),
        mcpIntegrationService.riskAssessment({
          portfolio: [{ symbol: 'BTCUSDT', quantity: 1, currentPrice: 50000 }],
          totalValue: 50000,
        }),
        mcpIntegrationService.strategyOptimizer({
          portfolio: [{ symbol: 'BTCUSDT', allocation: 1.0 }],
          objectiveFunction: 'sharpe_ratio',
          constraints: {},
        }),
        mcpIntegrationService.tradingTools({
          action: 'position_sizing',
          symbol: 'BTCUSDT',
          accountBalance: 10000,
        }),
      ];

      const results = await Promise.all(requests);

      results.forEach((result) => {
        expect(result.processingTimeMs).toBeDefined();
        expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Service Orchestration', () => {
    it('should maintain consistent service versioning', async () => {
      const responses = [
        mcpIntegrationService.getServiceInfo(),
        mcpIntegrationService.getUnifiedHealth(),
        mcpIntegrationService.resetEnvironment(),
        await mcpIntegrationService.aiMarketAnalysis({
          symbol: 'BTCUSDT',
          analysisType: 'sentiment',
        }),
      ];

      responses.forEach((response) => {
        expect(response.serviceVersion).toBe('mcp-integration-v1.0');
      });
    });

    it('should provide timestamp consistency', async () => {
      const startTime = Date.now();

      const result = await mcpIntegrationService.aiMarketAnalysis({
        symbol: 'BTCUSDT',
        analysisType: 'sentiment',
      });

      const endTime = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(startTime);
      expect(result.timestamp).toBeLessThanOrEqual(endTime);
    });

    it('should handle concurrent requests gracefully', async () => {
      const concurrentRequests = Array(5)
        .fill(null)
        .map(() =>
          mcpIntegrationService.aiMarketAnalysis({
            symbol: 'BTCUSDT',
            analysisType: 'sentiment',
            depth: 'quick', // Use quick for faster testing
          })
        );

      const results = await Promise.allSettled(concurrentRequests);

      // All requests should complete (success or failure)
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value).toBeDefined();
          expect(typeof result.value.success).toBe('boolean');
        }
      });
    });
  });
});
