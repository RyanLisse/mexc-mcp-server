/**
 * Portfolio Risk Assessment Tests
 * TDD tests for Task #26: Intelligent Risk Assessment API with Vercel AI SDK
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { RiskAssessment } from '../shared/types/ai-types';

// Setup mocks using Bun's testing API
const mockGeminiClient = {
  generateObject: mock(() => Promise.resolve({ success: false })),
};

const mockErrors = {
  handleAIError: mock(() => ({})),
  isAIOperationAllowed: mock(() => true),
  createErrorResponse: mock((error) => ({
      success: false,
      error: { message: error.message },
      timestamp: Date.now(),
    })) || ((error) => ({ success: false, error: { message: error.message } })),
};

const mockConfig = {
  config: {
    ai: {
      risk: {
        minConfidenceThreshold: 0.7,
      },
    },
  },
};

// Mock modules conditionally
if (globalThis.vi) {
  globalThis.vi.mock('../ai/gemini-client', () => ({
    geminiClient: mockGeminiClient,
  }));

  globalThis.vi.mock('../shared/errors', () => mockErrors);

  globalThis.vi.mock('../shared/config', () => mockConfig);
}

// Import service after mocks
import { mcpService } from './encore.service';

describe('Portfolio Risk Assessment - Task #26', () => {
  beforeEach(() => {
    mockGeminiClient.generateObject.mockClear();
    mockErrors.handleAIError.mockClear();
    mockErrors.isAIOperationAllowed.mockClear();
    mockErrors.createErrorResponse.mockClear();
  });

  describe('performRiskAssessment', () => {
    it('should perform basic portfolio risk assessment', async () => {
      // Arrange - Test data for a simple portfolio
      const portfolioData = {
        portfolio: [
          {
            symbol: 'BTCUSDT',
            quantity: 1.0,
            currentPrice: 45000,
            entryPrice: 40000,
            assetType: 'crypto' as const,
          },
        ],
        totalValue: 45000,
        riskTolerance: 'moderate' as const,
        timeHorizon: 'medium' as const,
      };

      // Act
      const result = await mcpService.performRiskAssessment(portfolioData);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.overallRiskLevel).toMatch(/^(low|medium|high|extreme)$/);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(result.diversificationScore).toBeLessThanOrEqual(1);
    });

    it('should handle multi-asset portfolio with diversification analysis', async () => {
      // Arrange - Test data for diversified portfolio
      const portfolioData = {
        portfolio: [
          {
            symbol: 'BTCUSDT',
            quantity: 0.5,
            currentPrice: 45000,
            entryPrice: 40000,
            assetType: 'crypto' as const,
          },
          {
            symbol: 'ETHUSDT',
            quantity: 3.0,
            currentPrice: 2500,
            entryPrice: 2200,
            assetType: 'crypto' as const,
          },
          {
            symbol: 'ADAUSDT',
            quantity: 10000,
            currentPrice: 0.4,
            entryPrice: 0.35,
            assetType: 'crypto' as const,
          },
        ],
        totalValue: 30000,
        riskTolerance: 'conservative' as const,
        timeHorizon: 'long' as const,
        marketContext: {
          marketSentiment: 'neutral' as const,
          volatilityIndex: 25,
          economicIndicators: {
            inflationRate: 3.2,
            interestRates: 5.5,
            unemploymentRate: 4.1,
          },
        },
      };

      // Act
      const result = await mcpService.performRiskAssessment(portfolioData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.assetAllocation).toHaveLength(3);
      expect(result.diversificationScore).toBeGreaterThan(0.3); // Should be better diversified
      expect(result.riskFactors).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should generate AI-powered analysis with Vercel AI SDK integration', async () => {
      // Arrange - Mock AI response
      const mockAIResponse = {
        success: true,
        data: {
          overallRiskLevel: 'medium',
          riskScore: 65,
          confidence: 0.85,
          diversificationScore: 0.7,
          volatility: {
            daily: 2.5,
            weekly: 8.2,
            monthly: 15.8,
          },
          riskFactors: [
            {
              factor: 'Market Volatility',
              impact: 'medium',
              description: 'Current market showing elevated volatility patterns',
            },
          ],
          assetAllocation: [
            {
              symbol: 'BTCUSDT',
              percentage: 100.0,
              riskLevel: 'medium',
              riskContribution: 100.0,
            },
          ],
          recommendations: [
            {
              type: 'diversify',
              description: 'Consider adding other asset classes',
              priority: 'medium',
            },
          ],
        },
        usage: {
          promptTokens: 800,
          completionTokens: 600,
          totalTokens: 1400,
        },
      };

      const { geminiClient } = await import('../ai/gemini-client');
      vi.mocked(geminiClient.generateObject).mockResolvedValue(mockAIResponse);

      const portfolioData = {
        portfolio: [
          {
            symbol: 'BTCUSDT',
            quantity: 1.0,
            currentPrice: 45000,
            entryPrice: 40000,
          },
        ],
        totalValue: 45000,
      };

      // Act
      const result = await mcpService.performAdvancedRiskAnalysis(
        {
          ...portfolioData,
          riskTolerance: 'moderate',
          timeHorizon: 'medium',
          analysisDepth: 'standard',
        },
        {
          depth: 'standard',
          temperature: 0.5,
          maxTokens: 4096,
          contextHours: 12,
          includeConfidenceIntervals: true,
          enableParallelProcessing: false,
        }
      );

      // Assert - Verify AI integration
      expect(geminiClient.generateObject).toHaveBeenCalledWith(
        expect.stringContaining('Perform a comprehensive portfolio risk assessment'),
        expect.objectContaining({
          type: 'object',
          properties: expect.objectContaining({
            overallRiskLevel: expect.any(Object),
            riskScore: expect.any(Object),
            confidence: expect.any(Object),
          }),
        }),
        'Portfolio Risk Assessment'
      );

      expect(result.success).toBe(true);
      expect(result.tokenUsage).toBeDefined();
      expect(result.tokenUsage?.totalTokens).toBe(1400);
      expect(result.tokenUsage?.estimatedCostUSD).toBeCloseTo(0.00105, 5);
    });

    it('should handle analysis errors with appropriate fallback', async () => {
      // Arrange - Mock AI failure
      const { geminiClient } = await import('../ai/gemini-client');
      vi.mocked(geminiClient.generateObject).mockResolvedValue({
        success: false,
        error: 'AI service temporarily unavailable',
      });

      const portfolioData = {
        portfolio: [
          {
            symbol: 'BTCUSDT',
            quantity: 1.0,
            currentPrice: 45000,
          },
        ],
        totalValue: 45000,
      };

      // Act
      const result = await mcpService.performRiskAssessment(portfolioData);

      // Assert - Should fallback gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.overallRiskLevel).toBe('high'); // Conservative fallback
      expect(result.confidence).toBe(0);
      expect(result.riskFactors).toHaveLength(1);
      expect(result.riskFactors?.[0].factor).toBe('Analysis Unavailable');
    });

    it('should validate portfolio data and provide meaningful errors', async () => {
      // Arrange - Invalid portfolio data
      const invalidPortfolioData = {
        portfolio: [], // Empty portfolio
        totalValue: 0,
      };

      // Act
      const result = await mcpService.performRiskAssessment(invalidPortfolioData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Portfolio cannot be empty');
    });

    it('should calculate stress test scenarios correctly', async () => {
      // Arrange
      const portfolioData = {
        portfolio: [
          {
            symbol: 'BTCUSDT',
            quantity: 1.0,
            currentPrice: 50000,
            entryPrice: 45000,
          },
          {
            symbol: 'ETHUSDT',
            quantity: 5.0,
            currentPrice: 3000,
            entryPrice: 2800,
          },
        ],
        totalValue: 65000,
        riskTolerance: 'aggressive',
        timeHorizon: 'short',
      };

      // Act
      const result = await mcpService.performRiskAssessment(portfolioData, 'comprehensive');

      // Assert
      expect(result.success).toBe(true);
      expect(result.stressTests).toBeDefined();
      expect(result.stressTests?.length).toBeGreaterThan(0);

      if (result.stressTests) {
        result.stressTests.forEach((test) => {
          expect(test.scenario).toBeDefined();
          expect(test.potentialLoss).toBeGreaterThanOrEqual(0);
          expect(test.probability).toBeGreaterThanOrEqual(0);
          expect(test.probability).toBeLessThanOrEqual(1);
        });
      }
    });
  });

  describe('performAdvancedRiskAnalysis', () => {
    it('should use Vercel AI SDK for structured JSON parsing', async () => {
      // Arrange
      const mockStructuredResponse = {
        success: true,
        data: {
          overallRiskLevel: 'low',
          riskScore: 30,
          confidence: 0.9,
          diversificationScore: 0.8,
          volatility: { daily: 1.5, weekly: 5.2, monthly: 11.8 },
          riskFactors: [],
          assetAllocation: [],
          recommendations: [],
        },
        usage: {
          promptTokens: 600,
          completionTokens: 400,
          totalTokens: 1000,
        },
      };

      const { geminiClient } = await import('../ai/gemini-client');
      vi.mocked(geminiClient.generateObject).mockResolvedValue(mockStructuredResponse);

      const analysisRequest = {
        portfolio: [{ symbol: 'BTCUSDT', quantity: 1.0, currentPrice: 40000 }],
        totalValue: 40000,
        riskTolerance: 'conservative' as const,
        timeHorizon: 'long' as const,
        analysisDepth: 'standard' as const,
      };

      const config = {
        depth: 'standard' as const,
        temperature: 0.5,
        maxTokens: 4096,
        contextHours: 12,
        includeConfidenceIntervals: true,
        enableParallelProcessing: false,
      };

      // Act
      const result = await mcpService.performAdvancedRiskAnalysis(analysisRequest, config);

      // Assert
      expect(result.success).toBe(true);
      expect(geminiClient.generateObject).toHaveBeenCalledWith(
        expect.stringContaining('portfolio risk assessment'),
        expect.objectContaining({
          type: 'object',
          properties: expect.objectContaining({
            overallRiskLevel: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'extreme'],
            },
          }),
        }),
        'Portfolio Risk Assessment'
      );
    });
  });
});
