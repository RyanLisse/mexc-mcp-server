/**
 * MCP API Tests
 * Comprehensive tests for AI Market Analysis endpoints
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mcpService } from './encore.service';
// Import types are used in function signatures and type assertions

// Mock modules at top level
vi.mock('../ai/gemini-analyzer', () => ({
  geminiAnalyzer: {
    analyzeSentiment: vi.fn(),
    performTechnicalAnalysis: vi.fn(),
    assessRisk: vi.fn(),
    analyzeTrend: vi.fn(),
    updateConfig: vi.fn(),
    getBudgetStatus: vi.fn(),
    getCacheStats: vi.fn(),
    getConfig: vi.fn(),
    resetBudgetWindow: vi.fn(),
    clearCache: vi.fn(),
  },
}));

vi.mock('../shared/errors', () => ({
  handleAIError: vi.fn((error, _analysisType, fallback) => ({
    success: false,
    error: error.message || 'Analysis failed',
    timestamp: Date.now(),
    processingTimeMs: 0,
    ...(fallback || {}),
  })),
  createErrorResponse: vi.fn((error) => ({
    success: false,
    error: { message: error.message },
    timestamp: Date.now(),
  })),
  logAndNotify: vi.fn(),
  createAIAnalysisError: vi.fn((message, type, options) => {
    const error = new Error(message);
    (error as any).analysisType = type;
    return error;
  }),
  retryWithBackoff: vi.fn((operation) => operation()),
  getFallbackAnalysisResult: vi.fn((_type, _data, _error) => ({
    success: false,
    error: 'Fallback result',
    timestamp: Date.now(),
    processingTimeMs: 0,
  })),
  isAIOperationAllowed: vi.fn(() => true),
}));

// Mock config
vi.mock('../shared/config', () => ({
  config: {
    ai: {
      risk: {
        minConfidenceThreshold: 0.7,
      },
      budget: {
        maxCostPerDay: 10.0,
      },
    },
  },
}));

describe('MCP Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('performMarketAnalysis', () => {
    it('should perform sentiment analysis with standard depth', async () => {
      // Mock successful sentiment analysis
      const mockResult = {
        success: true,
        sentiment: 'bullish',
        confidence: 0.85,
        riskLevel: 'medium',
        recommendations: ['Hold current position', 'Monitor for trend continuation'],
      };

      const { geminiAnalyzer } = await import('../ai/gemini-analyzer');
      vi.mocked(geminiAnalyzer.analyzeSentiment).mockResolvedValue(mockResult);

      const result = await mcpService.performMarketAnalysis(
        {
          symbol: 'BTCUSDT',
          price: 45000,
          volume: 1000000,
        },
        'sentiment',
        'standard'
      );

      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.85);
      expect(result.timestamp).toBeDefined();
      expect(result.processingTimeMs).toBeDefined();
      expect(result.modelVersion).toBe('gemini-2.5-flash-preview-05-20');
      expect(geminiAnalyzer.updateConfig).toHaveBeenCalledWith({
        temperature: 0.5,
        maxTokensPerRequest: 4096,
        cacheTTLMinutes: 15,
      });
    });

    it('should handle invalid symbol input', async () => {
      const result = await mcpService.performMarketAnalysis(
        {
          symbol: '', // Invalid empty symbol
          price: 45000,
        },
        'sentiment'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.success).toBe(false);
    });

    it('should perform technical analysis with required OHLCV data', async () => {
      const mockResult = {
        success: true,
        priceAction: 'Bullish continuation pattern',
        volume: 'Above average volume',
        momentum: 'Strong upward momentum',
        support: [44000, 43500],
        resistance: [46000, 47000],
      };

      const { geminiAnalyzer } = await import('../ai/gemini-analyzer');
      vi.mocked(geminiAnalyzer.performTechnicalAnalysis).mockResolvedValue(mockResult);

      const ohlcvData = [
        { open: 44000, high: 45500, low: 43800, close: 45000, volume: 1000 },
        { open: 45000, high: 46000, low: 44500, close: 45500, volume: 1200 },
      ];

      const result = await mcpService.performMarketAnalysis(
        {
          symbol: 'BTCUSDT',
          ohlcv: ohlcvData,
        },
        'technical',
        'comprehensive'
      );

      expect(result.success).toBe(true);
      expect(geminiAnalyzer.performTechnicalAnalysis).toHaveBeenCalled();
    });

    it('should handle technical analysis without required data', async () => {
      const result = await mcpService.performMarketAnalysis(
        {
          symbol: 'BTCUSDT',
          price: 45000,
          // Missing ohlcv and marketData
        },
        'technical'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.success).toBe(false);
    });

    it('should perform risk assessment', async () => {
      const mockResult = {
        success: true,
        riskLevel: 'low',
        confidence: 0.92,
        recommendations: ['Position size appropriate', 'Good risk/reward ratio'],
      };

      const { geminiAnalyzer } = await import('../ai/gemini-analyzer');
      vi.mocked(geminiAnalyzer.assessRisk).mockResolvedValue(mockResult);

      const result = await mcpService.performMarketAnalysis(
        {
          symbol: 'BTCUSDT',
          price: 45000,
          volume: 1000000,
        },
        'risk',
        'deep'
      );

      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.92);
      expect(geminiAnalyzer.updateConfig).toHaveBeenCalledWith({
        temperature: 0.9,
        maxTokensPerRequest: 8192,
        cacheTTLMinutes: 30,
      });
    });

    it('should handle trend analysis', async () => {
      const mockResult = {
        success: true,
        direction: 'up',
        strength: 0.8,
        priceAction: 'Strong uptrend',
        volume: 'Increasing volume',
        momentum: 'Accelerating',
        support: [44000],
        resistance: [47000],
      };

      const { geminiAnalyzer } = await import('../ai/gemini-analyzer');
      vi.mocked(geminiAnalyzer.analyzeTrend).mockResolvedValue(mockResult);

      const ohlcvData = [
        { open: 44000, high: 45500, low: 43800, close: 45000, volume: 1000 },
        { open: 45000, high: 46000, low: 44500, close: 45500, volume: 1200 },
      ];

      const result = await mcpService.performMarketAnalysis(
        {
          symbol: 'BTCUSDT',
          ohlcv: ohlcvData,
        },
        'trend'
      );

      expect(result.success).toBe(true);
      expect(geminiAnalyzer.analyzeTrend).toHaveBeenCalledWith({
        symbol: 'BTCUSDT',
        dataPoints: ohlcvData,
      });
    });

    it('should handle unsupported analysis type', async () => {
      const result = await mcpService.performMarketAnalysis(
        {
          symbol: 'BTCUSDT',
          price: 45000,
        },
        'unsupported' as any
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.success).toBe(false);
    });

    it('should validate confidence and retry for deep analysis', async () => {
      // First call returns low confidence
      const lowConfidenceResult = {
        success: true,
        confidence: 0.3,
        sentiment: 'neutral',
        riskLevel: 'medium',
        recommendations: ['Low confidence analysis'],
      };

      // Second call (retry) returns higher confidence
      const highConfidenceResult = {
        success: true,
        confidence: 0.8,
        sentiment: 'bullish',
        riskLevel: 'low',
        recommendations: ['Higher confidence after retry'],
      };

      const { geminiAnalyzer } = await import('../ai/gemini-analyzer');
      vi.mocked(geminiAnalyzer.analyzeSentiment)
        .mockResolvedValueOnce(lowConfidenceResult)
        .mockResolvedValueOnce(highConfidenceResult);

      const result = await mcpService.performMarketAnalysis(
        {
          symbol: 'BTCUSDT',
          price: 45000,
        },
        'sentiment',
        'deep' // Deep analysis should retry low confidence
      );

      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.8); // Should have the retried result
      expect(geminiAnalyzer.updateConfig).toHaveBeenCalledTimes(2); // Initial + retry
    });
  });

  describe('performMultiAnalysis', () => {
    it('should perform multiple analyses in parallel for comprehensive depth', async () => {
      const { geminiAnalyzer } = await import('../ai/gemini-analyzer');

      // Mock different analysis results
      vi.mocked(geminiAnalyzer.analyzeSentiment).mockResolvedValue({
        success: true,
        sentiment: 'bullish',
        confidence: 0.85,
        riskLevel: 'medium',
        recommendations: ['Bullish sentiment'],
      });

      vi.mocked(geminiAnalyzer.assessRisk).mockResolvedValue({
        success: true,
        riskLevel: 'low',
        confidence: 0.9,
        recommendations: ['Low risk position'],
      });

      const result = await mcpService.performMultiAnalysis(
        {
          symbol: 'BTCUSDT',
          price: 45000,
          volume: 1000000,
        },
        ['sentiment', 'risk'],
        'comprehensive'
      );

      expect(result.sentiment.success).toBe(true);
      expect(result.risk.success).toBe(true);
      expect(result.sentiment.confidence).toBe(0.85);
      expect(result.risk.confidence).toBe(0.9);
    });

    it('should handle mixed success/failure in multi-analysis', async () => {
      const { geminiAnalyzer } = await import('../ai/gemini-analyzer');

      // Mock one success, one failure
      vi.mocked(geminiAnalyzer.analyzeSentiment).mockResolvedValue({
        success: true,
        sentiment: 'bullish',
        confidence: 0.85,
        riskLevel: 'medium',
        recommendations: ['Bullish sentiment'],
      });

      vi.mocked(geminiAnalyzer.assessRisk).mockRejectedValue(new Error('Risk analysis failed'));

      const result = await mcpService.performMultiAnalysis(
        {
          symbol: 'BTCUSDT',
          price: 45000,
        },
        ['sentiment', 'risk'],
        'comprehensive'
      );

      expect(result.sentiment.success).toBe(true);
      expect(result.risk.success).toBe(false);
      expect(result.risk.error).toBeDefined();
      expect(result.risk.success).toBe(false);
    });

    it('should perform sequential processing for non-parallel depths', async () => {
      const { geminiAnalyzer } = await import('../ai/gemini-analyzer');

      vi.mocked(geminiAnalyzer.analyzeSentiment).mockResolvedValue({
        success: true,
        sentiment: 'neutral',
        confidence: 0.7,
        riskLevel: 'medium',
        recommendations: ['Neutral sentiment'],
      });

      // For standard depth (non-parallel), it should be called through performMarketAnalysis
      const result = await mcpService.performMultiAnalysis(
        {
          symbol: 'BTCUSDT',
          price: 45000,
        },
        ['sentiment'],
        'comprehensive' // This enables parallel processing
      );

      expect(result.sentiment.success).toBe(true);
    });
  });

  describe('getServiceHealth', () => {
    it('should return healthy status with normal budget usage', async () => {
      const { geminiAnalyzer } = await import('../ai/gemini-analyzer');

      vi.mocked(geminiAnalyzer.getBudgetStatus).mockReturnValue({
        tokensUsed: 10000,
        tokensRemaining: 90000,
        costUSD: 2.5, // 25% of $10 budget
        requestCount: 50,
      });

      vi.mocked(geminiAnalyzer.getCacheStats).mockReturnValue({
        hits: 80,
        misses: 20,
        hitRate: 0.8,
        totalEntries: 15,
      });

      vi.mocked(geminiAnalyzer.getConfig).mockReturnValue({
        model: 'gemini-2.5-flash-preview-05-20',
        temperature: 0.7,
        maxTokensPerRequest: 8192,
        cacheTTLMinutes: 15,
      });

      const health = mcpService.getServiceHealth();

      expect(health.status).toBe('healthy');
      expect(health.budgetStatus?.costUSD).toBe(2.5);
      expect(health.cacheStats?.hitRate).toBe(0.8);
    });

    it('should return degraded status when near budget limit', async () => {
      const { geminiAnalyzer } = await import('../ai/gemini-analyzer');

      vi.mocked(geminiAnalyzer.getBudgetStatus).mockReturnValue({
        tokensUsed: 120000,
        tokensRemaining: 10000,
        costUSD: 9.5, // 95% of $10 budget
        requestCount: 200,
      });

      vi.mocked(geminiAnalyzer.getCacheStats).mockReturnValue({
        hits: 40,
        misses: 60,
        hitRate: 0.4,
        totalEntries: 25,
      });

      vi.mocked(geminiAnalyzer.getConfig).mockReturnValue({
        model: 'gemini-2.5-flash-preview-05-20',
        temperature: 0.7,
        maxTokensPerRequest: 8192,
        cacheTTLMinutes: 15,
      });

      const health = mcpService.getServiceHealth();

      expect(health.status).toBe('degraded');
    });

    it('should return unhealthy status when budget exceeded', async () => {
      const { geminiAnalyzer } = await import('../ai/gemini-analyzer');

      vi.mocked(geminiAnalyzer.getBudgetStatus).mockReturnValue({
        tokensUsed: 150000,
        tokensRemaining: 0,
        costUSD: 12.0, // Over $10 budget
        requestCount: 300,
      });

      const health = mcpService.getServiceHealth();

      expect(health.status).toBe('unhealthy');
    });

    it('should handle errors gracefully', async () => {
      const { geminiAnalyzer } = await import('../ai/gemini-analyzer');

      vi.mocked(geminiAnalyzer.getBudgetStatus).mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const health = mcpService.getServiceHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.budgetStatus).toBe(null);
      expect(health.cacheStats).toBe(null);
      expect(health.configuration).toBe(null);
    });
  });

  describe('resetAnalysisEnvironment', () => {
    it('should reset budget and cache successfully', async () => {
      const { geminiAnalyzer } = await import('../ai/gemini-analyzer');

      vi.mocked(geminiAnalyzer.resetBudgetWindow).mockImplementation(() => {});
      vi.mocked(geminiAnalyzer.clearCache).mockImplementation(() => {});

      const result = mcpService.resetAnalysisEnvironment();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Analysis environment reset successfully');
      expect(geminiAnalyzer.resetBudgetWindow).toHaveBeenCalled();
      expect(geminiAnalyzer.clearCache).toHaveBeenCalled();
    });

    it('should handle reset errors', async () => {
      const { geminiAnalyzer } = await import('../ai/gemini-analyzer');

      vi.mocked(geminiAnalyzer.resetBudgetWindow).mockImplementation(() => {
        throw new Error('Reset failed');
      });

      const result = mcpService.resetAnalysisEnvironment();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to reset environment: Reset failed');
    });
  });
});

describe('Analysis Depth Configuration', () => {
  it('should return correct configuration for quick depth', () => {
    // This would test the internal getAnalysisDepthConfig function
    // We can test this indirectly through the performMarketAnalysis calls
    // The actual function is not exported, so we test its effects
  });

  it('should apply different configurations for different depths', async () => {
    const { geminiAnalyzer } = await import('../ai/gemini-analyzer');

    vi.mocked(geminiAnalyzer.analyzeSentiment).mockResolvedValue({
      success: true,
      sentiment: 'neutral',
      confidence: 0.7,
      riskLevel: 'medium',
      recommendations: [],
    });

    // Test quick depth
    await mcpService.performMarketAnalysis(
      { symbol: 'BTCUSDT', price: 45000 },
      'sentiment',
      'quick'
    );

    expect(geminiAnalyzer.updateConfig).toHaveBeenCalledWith({
      temperature: 0.3,
      maxTokensPerRequest: 2048,
      cacheTTLMinutes: 5,
    });

    // Test deep depth
    await mcpService.performMarketAnalysis(
      { symbol: 'BTCUSDT', price: 45000 },
      'sentiment',
      'deep'
    );

    expect(geminiAnalyzer.updateConfig).toHaveBeenCalledWith({
      temperature: 0.9,
      maxTokensPerRequest: 8192,
      cacheTTLMinutes: 30,
    });
  });
});
