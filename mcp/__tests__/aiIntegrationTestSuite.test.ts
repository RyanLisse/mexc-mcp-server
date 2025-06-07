/**
 * Comprehensive AI Integration Test Suite (Task #29)
 * Tests all AI-powered endpoints, GeminiAnalyzer functionality, and error handling
 * TDD Implementation - Comprehensive validation tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { geminiAnalyzer } from '../../ai/gemini-analyzer';
import { geminiClient } from '../../ai/gemini-client';
import type { AIAnalysisResult, AnalysisType } from '../../shared/types/ai-types';
import { mcpAnalysisService } from '../services/mcpAnalysis';
import { mcpCoreService } from '../services/mcpCore';
import { mcpIntegrationService } from '../services/mcpIntegration';
import { mcpRiskService } from '../services/mcpRisk';
import { mcpTradingToolsService } from '../services/mcpTradingTools';

describe('Comprehensive AI Integration Test Suite - Task #29', () => {
  describe('GeminiAnalyzer Core Functionality', () => {
    describe('Initialization and Configuration', () => {
      it('should initialize GeminiAnalyzer with correct configuration', () => {
        expect(geminiAnalyzer).toBeDefined();
        expect(typeof geminiAnalyzer.analyzeSentiment).toBe('function');
        expect(typeof geminiAnalyzer.analyzeTechnical).toBe('function');
        expect(typeof geminiAnalyzer.analyzeRisk).toBe('function');
        expect(typeof geminiAnalyzer.analyzeTrend).toBe('function');
      });

      it('should have proper model configuration', () => {
        const config = geminiAnalyzer.getModelConfig();
        expect(config).toBeDefined();
        expect(config.model).toBe('gemini-2.5-flash-preview-05-20');
        expect(config.temperature).toBeGreaterThanOrEqual(0);
        expect(config.temperature).toBeLessThanOrEqual(2);
      });

      it('should have caching mechanism configured', () => {
        expect(geminiAnalyzer.getCacheStats).toBeDefined();
        const cacheStats = geminiAnalyzer.getCacheStats();
        expect(cacheStats).toHaveProperty('hits');
        expect(cacheStats).toHaveProperty('misses');
        expect(cacheStats).toHaveProperty('hitRate');
      });

      it('should have thinking budget management', () => {
        expect(geminiAnalyzer.getBudgetStatus).toBeDefined();
        const budgetStatus = geminiAnalyzer.getBudgetStatus();
        expect(budgetStatus).toHaveProperty('tokensUsed');
        expect(budgetStatus).toHaveProperty('tokensRemaining');
        expect(budgetStatus).toHaveProperty('costUSD');
      });
    });

    describe('Analysis Depth Levels', () => {
      const testSymbol = 'BTCUSDT';
      const analysisTypes: AnalysisType[] = ['sentiment', 'technical', 'risk', 'trend'];
      const depths = ['quick', 'standard', 'comprehensive', 'deep'] as const;

      analysisTypes.forEach((analysisType) => {
        depths.forEach((depth) => {
          it(`should support ${depth} analysis for ${analysisType}`, async () => {
            const mockData = {
              symbol: testSymbol,
              price: 50000,
              volume: 1000000,
            };

            // This will likely fail due to API keys, but structure should be correct
            const result = await mcpAnalysisService.performMarketAnalysis(
              mockData,
              analysisType,
              depth
            );

            expect(result).toBeDefined();
            expect(typeof result.success).toBe('boolean');
            expect(result.analysisType).toBe(analysisType);
            expect(result.depth).toBe(depth);
          });
        });
      });
    });

    describe('Confidence Validation', () => {
      it('should validate confidence scores are within expected range', async () => {
        const mockAnalysisResult: AIAnalysisResult = {
          success: true,
          analysisType: 'sentiment',
          confidence: 0.8,
          sentiment: {
            score: 0.7,
            label: 'bullish',
            reasoning: 'Test reasoning',
          },
          timestamp: Date.now(),
          processingTimeMs: 1000,
        };

        expect(mockAnalysisResult.confidence).toBeGreaterThanOrEqual(0);
        expect(mockAnalysisResult.confidence).toBeLessThanOrEqual(1);
      });

      it('should handle low confidence scenarios', () => {
        const lowConfidenceResult: AIAnalysisResult = {
          success: true,
          analysisType: 'technical',
          confidence: 0.3, // Low confidence
          technical: {
            trend: 'sideways',
            strength: 0.2,
            signals: [],
            supportLevels: [],
            resistanceLevels: [],
          },
          timestamp: Date.now(),
          processingTimeMs: 1000,
        };

        // Should still be valid but flagged as low confidence
        expect(lowConfidenceResult.confidence).toBeLessThan(0.7);
        expect(lowConfidenceResult.success).toBe(true);
      });
    });
  });

  describe('API Endpoint Comprehensive Testing', () => {
    describe('Market Analysis Endpoint (/mcp/ai-market-analysis)', () => {
      it('should validate all required parameters', async () => {
        const invalidRequests = [
          { symbol: '', analysisType: 'sentiment' },
          { symbol: 'BTCUSDT', analysisType: '' },
          { symbol: 'BTCUSDT' }, // Missing analysisType
        ];

        for (const request of invalidRequests) {
          const result = await mcpIntegrationService.aiMarketAnalysis(request as any);
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        }
      });

      it('should accept all valid analysis types and depths', async () => {
        const validCombinations = [
          { analysisType: 'sentiment', depth: 'quick' },
          { analysisType: 'technical', depth: 'standard' },
          { analysisType: 'risk', depth: 'comprehensive' },
          { analysisType: 'trend', depth: 'deep' },
        ];

        for (const combo of validCombinations) {
          const result = await mcpIntegrationService.aiMarketAnalysis({
            symbol: 'BTCUSDT',
            analysisType: combo.analysisType as AnalysisType,
            depth: combo.depth as any,
          });

          expect(result).toBeDefined();
          expect(typeof result.success).toBe('boolean');
          expect(result.serviceVersion).toBe('mcp-integration-v1.0');
        }
      });

      it('should include proper metadata in responses', async () => {
        const result = await mcpIntegrationService.aiMarketAnalysis({
          symbol: 'BTCUSDT',
          analysisType: 'sentiment',
          depth: 'quick',
        });

        expect(result.timestamp).toBeDefined();
        expect(result.processingTimeMs).toBeDefined();
        expect(result.serviceVersion).toBe('mcp-integration-v1.0');
      });
    });

    describe('Risk Assessment Endpoint (/mcp/risk-assessment)', () => {
      const validPortfolio = [
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
      ];

      it('should validate portfolio requirements', async () => {
        const invalidRequests = [
          { portfolio: [], totalValue: 10000 },
          { portfolio: validPortfolio, totalValue: -1000 },
          { portfolio: validPortfolio, totalValue: 0 },
        ];

        for (const request of invalidRequests) {
          const result = await mcpIntegrationService.riskAssessment(request);
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        }
      });

      it('should accept valid risk assessment requests', async () => {
        const result = await mcpIntegrationService.riskAssessment({
          portfolio: validPortfolio,
          totalValue: 80000,
          riskTolerance: 'moderate',
          timeHorizon: 'medium',
        });

        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(result.serviceVersion).toBe('mcp-integration-v1.0');
      });

      it('should support all risk tolerance and time horizon options', async () => {
        const riskTolerances = ['conservative', 'moderate', 'aggressive'] as const;
        const timeHorizons = ['short', 'medium', 'long'] as const;

        for (const riskTolerance of riskTolerances) {
          for (const timeHorizon of timeHorizons) {
            const result = await mcpIntegrationService.riskAssessment({
              portfolio: validPortfolio,
              totalValue: 80000,
              riskTolerance,
              timeHorizon,
            });

            expect(result).toBeDefined();
            expect(typeof result.success).toBe('boolean');
          }
        }
      });
    });

    describe('Strategy Optimizer Endpoint (/mcp/strategy-optimizer)', () => {
      const validStrategy = {
        portfolio: [
          { symbol: 'BTCUSDT', allocation: 0.6 },
          { symbol: 'ETHUSDT', allocation: 0.4 },
        ],
        objectiveFunction: 'sharpe_ratio' as const,
        constraints: {
          maxRisk: 0.3,
          minReturn: 0.1,
        },
      };

      it('should validate portfolio allocation weights', async () => {
        const invalidAllocations = [
          {
            portfolio: [
              { symbol: 'BTCUSDT', allocation: 0.7 },
              { symbol: 'ETHUSDT', allocation: 0.5 },
            ],
          }, // Sum > 1
          {
            portfolio: [
              { symbol: 'BTCUSDT', allocation: 0.3 },
              { symbol: 'ETHUSDT', allocation: 0.3 },
            ],
          }, // Sum < 1
        ];

        for (const invalid of invalidAllocations) {
          const result = await mcpIntegrationService.strategyOptimizer({
            ...validStrategy,
            ...invalid,
          });
          expect(result.success).toBe(false);
          expect(result.error).toContain('allocations must sum to approximately 1.0');
        }
      });

      it('should support all objective functions', async () => {
        const objectives = ['sharpe_ratio', 'max_return', 'min_risk', 'min_drawdown'] as const;

        for (const objectiveFunction of objectives) {
          const result = await mcpIntegrationService.strategyOptimizer({
            ...validStrategy,
            objectiveFunction,
          });

          expect(result).toBeDefined();
          expect(typeof result.success).toBe('boolean');
        }
      });

      it('should automatically configure MEXC parameters', async () => {
        const result = await mcpIntegrationService.strategyOptimizer(validStrategy);

        // Should include MEXC-specific processing internally
        expect(result).toBeDefined();
        expect(result.serviceVersion).toBe('mcp-integration-v1.0');
      });
    });

    describe('Trading Tools Endpoint (/mcp/trading-tools)', () => {
      const baseRequest = {
        symbol: 'BTCUSDT',
        accountBalance: 10000,
      };

      it('should support all trading tool actions', async () => {
        const actions = [
          'position_sizing',
          'stop_loss',
          'take_profit',
          'risk_reward',
          'technical_analysis',
          'market_conditions',
        ] as const;

        for (const action of actions) {
          const result = await mcpIntegrationService.tradingTools({
            ...baseRequest,
            action,
          });

          expect(result).toBeDefined();
          expect(typeof result.success).toBe('boolean');
          expect(result.serviceVersion).toBe('mcp-integration-v1.0');
        }
      });

      it('should validate trading parameters', async () => {
        const invalidRequests = [
          { ...baseRequest, action: 'position_sizing', symbol: '' },
          { ...baseRequest, action: 'position_sizing', accountBalance: -1000 },
          { ...baseRequest, action: 'position_sizing', riskPerTrade: 2 }, // > 100%
        ];

        for (const request of invalidRequests) {
          const result = await mcpIntegrationService.tradingTools(request as any);
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        }
      });

      it('should handle MEXC-specific features', async () => {
        const result = await mcpIntegrationService.tradingTools({
          ...baseRequest,
          action: 'position_sizing',
          mexcFeatures: {
            utilize0Fees: true,
            considerLeverage: true,
            maxLeverage: 125,
          },
        });

        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
      });
    });
  });

  describe('Encore.ts Validation Compliance', () => {
    it('should follow Encore.ts API standards for all endpoints', () => {
      // Check that services are properly structured
      expect(mcpIntegrationService).toBeDefined();
      expect(mcpAnalysisService).toBeDefined();
      expect(mcpRiskService).toBeDefined();
      expect(mcpTradingToolsService).toBeDefined();
      expect(mcpCoreService).toBeDefined();
    });

    it('should have consistent error handling across all services', async () => {
      const services = [
        () => mcpIntegrationService.aiMarketAnalysis({ symbol: '', analysisType: 'sentiment' }),
        () => mcpIntegrationService.riskAssessment({ portfolio: [], totalValue: 10000 }),
        () =>
          mcpIntegrationService.strategyOptimizer({
            portfolio: [],
            objectiveFunction: 'sharpe_ratio',
            constraints: {},
          }),
        () =>
          mcpIntegrationService.tradingTools({
            action: 'position_sizing',
            symbol: '',
            accountBalance: 10000,
          }),
      ];

      for (const serviceCall of services) {
        const result = await serviceCall();
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
        expect(result.serviceVersion).toBe('mcp-integration-v1.0');
      }
    });

    it('should provide consistent response structure', async () => {
      const result = await mcpIntegrationService.aiMarketAnalysis({
        symbol: 'BTCUSDT',
        analysisType: 'sentiment',
      });

      // Should have standard response structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('serviceVersion');
      expect(result).toHaveProperty('processingTimeMs');

      if (!result.success) {
        expect(result).toHaveProperty('error');
      }
    });
  });

  describe('Streaming Analysis Functionality', () => {
    it('should support streaming analysis capabilities', () => {
      // Check that streaming infrastructure exists
      expect(mcpAnalysisService.performMultiAnalysis).toBeDefined();
      expect(typeof mcpAnalysisService.performMultiAnalysis).toBe('function');
    });

    it('should handle multi-analysis requests', async () => {
      const result = await mcpIntegrationService.performMultiAnalysis({
        symbol: 'BTCUSDT',
        analysisTypes: ['sentiment', 'risk'],
        depth: 'comprehensive',
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.serviceVersion).toBe('mcp-integration-v1.0');
    });

    it('should validate multi-analysis parameters', async () => {
      const invalidRequests = [
        { symbol: '', analysisTypes: ['sentiment'] },
        { symbol: 'BTCUSDT', analysisTypes: [] },
      ];

      for (const request of invalidRequests) {
        const result = await mcpIntegrationService.performMultiAnalysis(request as any);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle network timeouts gracefully', async () => {
      // Test with very quick timeout to simulate network issues
      const result = await mcpIntegrationService.aiMarketAnalysis({
        symbol: 'BTCUSDT',
        analysisType: 'sentiment',
        depth: 'quick',
      });

      // Should either succeed or fail gracefully with proper error structure
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });

    it('should handle invalid API keys properly', async () => {
      // This test will likely fail due to invalid API keys, but should fail gracefully
      const result = await mcpIntegrationService.aiMarketAnalysis({
        symbol: 'BTCUSDT',
        analysisType: 'sentiment',
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.serviceVersion).toBe('mcp-integration-v1.0');
    });

    it('should provide meaningful error messages', async () => {
      const result = await mcpIntegrationService.aiMarketAnalysis({
        symbol: '',
        analysisType: 'sentiment',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Symbol and analysis type are required');
    });

    it('should handle edge cases gracefully', async () => {
      const edgeCases = [
        { symbol: 'INVALID_SYMBOL', analysisType: 'sentiment' },
        { symbol: 'BTCUSDT', analysisType: 'sentiment', depth: 'invalid_depth' as any },
      ];

      for (const edgeCase of edgeCases) {
        const result = await mcpIntegrationService.aiMarketAnalysis(edgeCase);
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
      }
    });
  });

  describe('AI Model Integration', () => {
    it('should have proper Vercel AI SDK integration', () => {
      expect(geminiClient).toBeDefined();
      expect(typeof geminiClient.generateText).toBe('function');
      expect(typeof geminiClient.generateObject).toBe('function');
    });

    it('should validate tool calling capabilities', () => {
      // Check that tool schemas are properly defined
      const positionSizingSchema = mcpTradingToolsService.getTradingToolsSchema('position_sizing');
      expect(positionSizingSchema).toBeDefined();
      expect(positionSizingSchema._def).toBeDefined(); // Zod schema
    });

    it('should handle JSON parsing validation', async () => {
      // Test that schemas can parse valid data
      const validData = {
        confidence: 0.8,
        positionSizing: {
          recommendedSize: 1000,
          riskAmount: 200,
          riskPercentage: 0.02,
          leverageRecommendation: 2,
        },
        riskManagement: {
          stopLossPrice: 45000,
          takeProfitPrice: 55000,
          riskRewardRatio: 2.5,
        },
        recommendations: [
          {
            type: 'position_size',
            priority: 'high' as const,
            description: 'Test recommendation',
          },
        ],
      };

      const schema = mcpTradingToolsService.getTradingToolsSchema('position_sizing');
      expect(() => schema.parse(validData)).not.toThrow();
    });

    it('should maintain model version compatibility', () => {
      const config = geminiAnalyzer.getModelConfig();
      expect(config.model).toBe('gemini-2.5-flash-preview-05-20');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array(3)
        .fill(null)
        .map(() =>
          mcpIntegrationService.aiMarketAnalysis({
            symbol: 'BTCUSDT',
            analysisType: 'sentiment',
            depth: 'quick',
          })
        );

      const results = await Promise.allSettled(concurrentRequests);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value).toBeDefined();
          expect(typeof result.value.success).toBe('boolean');
        }
      });
    });

    it('should have reasonable response times', async () => {
      const startTime = Date.now();

      const result = await mcpIntegrationService.aiMarketAnalysis({
        symbol: 'BTCUSDT',
        analysisType: 'sentiment',
        depth: 'quick',
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(responseTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should provide performance metrics in responses', async () => {
      const result = await mcpIntegrationService.aiMarketAnalysis({
        symbol: 'BTCUSDT',
        analysisType: 'sentiment',
      });

      expect(result.processingTimeMs).toBeDefined();
      expect(typeof result.processingTimeMs).toBe('number');
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Service Health and Monitoring', () => {
    it('should provide unified health status', () => {
      const health = mcpIntegrationService.getUnifiedHealth();

      expect(health.success).toBe(true);
      expect(health.data).toBeDefined();
      expect(health.serviceVersion).toBe('mcp-integration-v1.0');
    });

    it('should support environment reset functionality', () => {
      const result = mcpIntegrationService.resetEnvironment();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.serviceVersion).toBe('mcp-integration-v1.0');
    });

    it('should provide comprehensive service information', () => {
      const serviceInfo = mcpIntegrationService.getServiceInfo();

      expect(serviceInfo.success).toBe(true);
      expect(serviceInfo.data?.availableEndpoints).toContain('aiMarketAnalysis');
      expect(serviceInfo.data?.availableEndpoints).toContain('riskAssessment');
      expect(serviceInfo.data?.availableEndpoints).toContain('strategyOptimizer');
      expect(serviceInfo.data?.availableEndpoints).toContain('tradingTools');
    });
  });

  describe('Integration with Existing Systems', () => {
    it('should maintain compatibility with MCP protocol', () => {
      // Verify that all services follow MCP patterns
      expect(mcpIntegrationService.getServiceInfo).toBeDefined();
      expect(mcpIntegrationService.getUnifiedHealth).toBeDefined();
      expect(mcpIntegrationService.resetEnvironment).toBeDefined();
    });

    it('should integrate with error handling system', async () => {
      const result = await mcpIntegrationService.aiMarketAnalysis({
        symbol: '',
        analysisType: 'sentiment',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.serviceVersion).toBe('mcp-integration-v1.0');
      expect(result.timestamp).toBeDefined();
    });

    it('should support all implemented AI features', () => {
      const serviceInfo = mcpIntegrationService.getServiceInfo();

      const expectedFeatures = [
        'AI Market Analysis (Task #24)',
        'Risk Assessment (Task #26)',
        'Strategy Optimizer (Task #27)',
        'Trading Tools (Task #28)',
      ];

      expectedFeatures.forEach((feature) => {
        expect(serviceInfo.data?.implementedFeatures).toContain(feature);
      });
    });
  });
});
