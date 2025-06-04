# Testing Guide

This comprehensive guide covers testing strategies, frameworks, and best practices for the MEXC MCP server's AI integration features.

## Overview

The MEXC MCP server uses a robust testing strategy that includes:

- **Unit Tests**: Individual component testing
- **Integration Tests**: AI service integration testing (Task #29)
- **API Tests**: Endpoint testing with real and mocked data
- **Documentation Tests**: Ensuring documentation completeness (Task #33)
- **Performance Tests**: Load and stress testing for AI services

## Test Framework and Tools

### Primary Test Runner

The project uses **Bun's built-in test runner** for optimal performance:

```bash
# Run all tests
bun test

# Run specific test file
bun test auth/auth.test.ts

# Run tests with coverage
bun run test:coverage

# Run only AI integration tests
bun test ai/

# Run with verbose output
bun test --verbose
```

### Testing Libraries

- **Bun Test**: Primary test runner and assertion library
- **Vitest**: Additional testing utilities for complex scenarios
- **MSW (Mock Service Worker)**: HTTP request mocking
- **Test Containers**: Database and service testing (if needed)

## Test Structure and Organization

### Test File Naming

Follow consistent naming conventions:

```bash
# Unit tests
component.test.ts
service.test.ts
utils.test.ts

# Integration tests
integration.test.ts
api-integration.test.ts
ai-integration.test.ts

# End-to-end tests
e2e.test.ts
system.test.ts
```

### Test Organization

```
project-root/
├── auth/
│   ├── auth.ts
│   └── auth.test.ts
├── mcp/
│   ├── api.ts
│   ├── __tests__/
│   │   ├── comprehensive-health-endpoint.test.ts
│   │   └── ai-integration.test.ts
│   └── services/
│       └── __tests__/
│           └── mcpIntegration.test.ts
└── docs/
    └── __tests__/
        └── documentation-completeness.test.ts
```

## AI Integration Test Suite (Task #29)

### Comprehensive AI Testing

The AI integration test suite validates all AI-enhanced features:

```typescript
import { describe, expect, it, beforeEach, mock } from 'bun:test';
import { mcpIntegrationService } from '../services/mcpIntegration';

describe('AI Integration Test Suite - Task #29', () => {
  beforeEach(() => {
    // Setup mocks for consistent testing
    mock.reset();
  });

  describe('Market Analysis Integration', () => {
    it('should perform sentiment analysis with valid inputs', async () => {
      const result = await mcpIntegrationService.aiMarketAnalysis({
        symbol: 'BTCUSDT',
        analysisType: 'sentiment',
        depth: 'standard',
        price: 45000
      });

      expect(result.success).toBe(true);
      expect(result.data?.confidence).toBeGreaterThan(0);
      expect(result.data?.sentiment).toMatch(/^(bullish|bearish|neutral)$/);
    });

    it('should handle technical analysis with OHLCV data', async () => {
      const ohlcvData = [
        { open: 44800, high: 45200, low: 44600, close: 45000, volume: 1000000, timestamp: Date.now() }
      ];

      const result = await mcpIntegrationService.aiMarketAnalysis({
        symbol: 'ETHUSDT',
        analysisType: 'technical',
        depth: 'comprehensive',
        ohlcv: ohlcvData
      });

      expect(result.success).toBe(true);
      expect(result.data?.trendDirection).toBeDefined();
      expect(result.data?.signals).toBeInstanceOf(Array);
    });

    it('should perform multi-analysis with parallel processing', async () => {
      const result = await mcpIntegrationService.performMultiAnalysis({
        symbol: 'ADAUSDT',
        analysisTypes: ['sentiment', 'technical', 'risk'],
        depth: 'comprehensive'
      });

      expect(result.success).toBe(true);
      expect(result.data?.sentiment).toBeDefined();
      expect(result.data?.technical).toBeDefined();
      expect(result.data?.risk).toBeDefined();
    });
  });

  describe('Strategy Optimization Integration', () => {
    it('should optimize portfolio using AI recommendations', async () => {
      const portfolio = [
        { symbol: 'BTCUSDT', allocation: 0.5 },
        { symbol: 'ETHUSDT', allocation: 0.3 },
        { symbol: 'ADAUSDT', allocation: 0.2 }
      ];

      const result = await mcpIntegrationService.strategyOptimizer({
        portfolio,
        objectiveFunction: 'sharpe_ratio',
        constraints: { maxRisk: 0.15 }
      });

      expect(result.success).toBe(true);
      expect(result.data?.optimizedMetrics).toBeDefined();
      expect(result.data?.allocations).toBeInstanceOf(Array);
    });

    it('should leverage MEXC-specific features in optimization', async () => {
      const result = await mcpIntegrationService.strategyOptimizer({
        portfolio: [{ symbol: 'BTCUSDT', allocation: 1.0 }],
        objectiveFunction: 'max_return',
        constraints: { maxRisk: 0.2 },
        mexcParameters: {
          utilize0Fees: true,
          considerLeverage: true,
          maxLeverage: 10
        }
      });

      expect(result.success).toBe(true);
      expect(result.data?.mexcAdvantages).toBeDefined();
    });
  });

  describe('Trading Tools Integration', () => {
    it('should calculate position sizing with risk management', async () => {
      const result = await mcpIntegrationService.tradingTools({
        action: 'position_sizing',
        symbol: 'BTCUSDT',
        accountBalance: 10000,
        riskPerTrade: 0.02,
        entryPrice: 45000,
        stopLossPrice: 44000
      });

      expect(result.success).toBe(true);
      expect(result.data?.positionSizing).toBeDefined();
      expect(result.data?.positionSizing.recommendedSize).toBeGreaterThan(0);
    });

    it('should provide technical analysis for trading decisions', async () => {
      const result = await mcpIntegrationService.tradingTools({
        action: 'technical_analysis',
        symbol: 'ETHUSDT',
        currentPrice: 2400,
        indicators: {
          rsi: 65,
          macd: 120
        }
      });

      expect(result.success).toBe(true);
      expect(result.data?.technicalAnalysis).toBeDefined();
      expect(result.data?.technicalAnalysis.trendDirection).toMatch(/^(bullish|bearish|neutral|sideways)$/);
    });
  });

  describe('Risk Assessment Integration', () => {
    it('should assess portfolio risk comprehensively', async () => {
      const portfolio = [
        { symbol: 'BTCUSDT', quantity: 0.5, currentPrice: 45000, entryPrice: 44000 }
      ];

      const result = await mcpIntegrationService.riskAssessment({
        portfolio,
        totalValue: 22500,
        riskTolerance: 'moderate'
      });

      expect(result.success).toBe(true);
      expect(result.data?.overallRiskLevel).toMatch(/^(low|medium|high|extreme)$/);
      expect(result.data?.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.data?.riskScore).toBeLessThanOrEqual(100);
    });

    it('should provide risk recommendations', async () => {
      const result = await mcpIntegrationService.riskAssessment({
        portfolio: [
          { symbol: 'BTCUSDT', quantity: 1.0, currentPrice: 45000 }
        ],
        totalValue: 45000,
        riskTolerance: 'conservative'
      });

      expect(result.success).toBe(true);
      expect(result.data?.recommendations).toBeInstanceOf(Array);
      if (result.data?.recommendations.length > 0) {
        expect(result.data.recommendations[0].type).toBeDefined();
        expect(result.data.recommendations[0].priority).toMatch(/^(low|medium|high)$/);
      }
    });
  });

  describe('Health Monitoring Integration (Task #32)', () => {
    it('should provide comprehensive health status', async () => {
      const result = await mcpIntegrationService.getHealthStatus();

      expect(result.success).toBe(true);
      expect(result.data?.geminiApi).toBeDefined();
      expect(result.data?.mexcIntegration).toBeDefined();
      expect(result.data?.aiServices).toBeDefined();
      expect(result.data?.overall).toBeDefined();
    });

    it('should include performance metrics and recovery actions', async () => {
      const result = await mcpIntegrationService.getHealthStatus();

      if (result.success) {
        expect(result.data.overall.healthScore).toBeGreaterThanOrEqual(0);
        expect(result.data.overall.healthScore).toBeLessThanOrEqual(100);
        expect(result.data.overall.status).toMatch(/^(OK|WARNING|ERROR)$/);
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle invalid API keys gracefully', async () => {
      // Mock invalid API key scenario
      const originalApiKey = process.env.MEXC_API_KEY;
      process.env.MEXC_API_KEY = 'invalid_key';

      const result = await mcpIntegrationService.aiMarketAnalysis({
        symbol: 'BTCUSDT',
        analysisType: 'sentiment'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key');

      // Restore original API key
      process.env.MEXC_API_KEY = originalApiKey;
    });

    it('should handle AI service timeouts', async () => {
      // Mock timeout scenario
      const result = await mcpIntegrationService.aiMarketAnalysis({
        symbol: 'TIMEOUTTEST',
        analysisType: 'sentiment',
        parameters: { maxTokens: 1 } // Extremely low to potentially cause issues
      });

      // Should either succeed or fail gracefully
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
```

### Running AI Integration Tests

```bash
# Run full AI integration test suite
bun test ai/ai-integration.test.ts

# Run with coverage for AI components
bun run test:coverage --include="ai/**" --include="mcp/**"

# Run AI tests with real API integration
MEXC_API_KEY=your_key GOOGLE_API_KEY=your_key bun test ai/

# Run AI tests in verbose mode
bun test ai/ --verbose
```

## Writing Additional Tests

### Unit Test Template

```typescript
import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
    mock.reset();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('method or feature group', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = {};
      
      // Act
      const result = componentMethod(input);
      
      // Assert
      expect(result).toBeDefined();
    });

    it('should handle edge case', () => {
      // Test edge cases
    });

    it('should handle error case', () => {
      // Test error handling
    });
  });
});
```

### Integration Test Template

```typescript
import { describe, expect, it, beforeAll, afterAll } from 'bun:test';

describe('ServiceName Integration', () => {
  beforeAll(async () => {
    // Setup integration test environment
    await setupTestEnvironment();
  });

  afterAll(async () => {
    // Cleanup integration test environment
    await cleanupTestEnvironment();
  });

  it('should integrate with external service', async () => {
    // Test real integration
    const result = await serviceCall();
    expect(result.success).toBe(true);
  });
});
```

### Mocking External Services

```typescript
import { mock } from 'bun:test';

// Mock MEXC API responses
const mockMexcResponse = {
  success: true,
  data: { price: 45000, volume: 1000000 }
};

mock.module('../mexc-client', () => ({
  getMexcPrice: mock(() => Promise.resolve(mockMexcResponse)),
  getMexcVolume: mock(() => Promise.resolve({ volume: 1000000 }))
}));

// Mock Gemini AI responses
const mockGeminiResponse = {
  success: true,
  confidence: 0.85,
  sentiment: 'bullish',
  reasoning: 'Strong technical indicators'
};

mock.module('../gemini-analyzer', () => ({
  analyzeMarket: mock(() => Promise.resolve(mockGeminiResponse))
}));
```

## Test Coverage Expectations

### Coverage Targets

- **Overall Coverage**: 90%+ line coverage
- **Critical Paths**: 95%+ coverage for trading and risk logic
- **AI Integration**: 85%+ coverage (some AI responses are non-deterministic)
- **API Endpoints**: 100% coverage for all endpoints
- **Error Handling**: 90%+ coverage for error scenarios

### Running Coverage Reports

```bash
# Generate coverage report
bun run test:coverage

# Generate HTML coverage report
bun run test:coverage --reporter=html

# Check coverage for specific directory
bun run test:coverage --include="mcp/**"

# Fail if coverage below threshold
bun run test:coverage --coverage.threshold.lines=90
```

### Coverage Configuration

```typescript
// vitest.config.ts or similar
export default {
  test: {
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html', 'lcov'],
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 90,
          statements: 90
        }
      },
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'test-setup.ts'
      ]
    }
  }
};
```

## Performance Testing

### Load Testing AI Endpoints

```typescript
import { describe, it, expect } from 'bun:test';

describe('AI Performance Tests', () => {
  it('should handle concurrent AI analysis requests', async () => {
    const concurrentRequests = 10;
    const startTime = Date.now();
    
    const promises = Array.from({ length: concurrentRequests }, (_, i) =>
      mcpIntegrationService.aiMarketAnalysis({
        symbol: 'BTCUSDT',
        analysisType: 'sentiment',
        depth: 'quick' // Use quick mode for performance testing
      })
    );
    
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    // All requests should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
    
    // Should complete within reasonable time
    expect(duration).toBeLessThan(5000); // 5 seconds
    
    console.log(`${concurrentRequests} concurrent requests completed in ${duration}ms`);
  });

  it('should maintain response times under load', async () => {
    const maxResponseTime = 2000; // 2 seconds
    
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      
      const result = await mcpIntegrationService.aiMarketAnalysis({
        symbol: 'ETHUSDT',
        analysisType: 'technical',
        depth: 'standard'
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(responseTime).toBeLessThan(maxResponseTime);
      
      console.log(`Request ${i + 1}: ${responseTime}ms`);
    }
  });
});
```

### Memory Usage Testing

```typescript
describe('Memory Usage Tests', () => {
  it('should not have memory leaks in AI processing', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Perform multiple AI operations
    for (let i = 0; i < 100; i++) {
      await mcpIntegrationService.aiMarketAnalysis({
        symbol: 'ADAUSDT',
        analysisType: 'sentiment',
        depth: 'quick'
      });
      
      // Force garbage collection occasionally
      if (i % 10 === 0 && global.gc) {
        global.gc();
      }
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    
    console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  });
});
```

## Test Data Management

### Test Fixtures

```typescript
// test-fixtures/market-data.ts
export const sampleOHLCVData = [
  { open: 44800, high: 45200, low: 44600, close: 45000, volume: 1000000, timestamp: 1703123456789 },
  { open: 45000, high: 45400, low: 44900, close: 45200, volume: 1200000, timestamp: 1703209856789 }
];

export const samplePortfolio = [
  { symbol: 'BTCUSDT', quantity: 0.5, currentPrice: 45000, entryPrice: 44000 },
  { symbol: 'ETHUSDT', quantity: 2.0, currentPrice: 2400, entryPrice: 2300 }
];

export const sampleMarketData = {
  volatility: 0.15,
  volume24h: 50000000,
  marketCap: 875000000000
};
```

### Test Database Setup

```typescript
// test-setup.ts
import { beforeAll, afterAll } from 'bun:test';

beforeAll(async () => {
  // Setup test database or mock services
  await setupTestEnvironment();
});

afterAll(async () => {
  // Cleanup test environment
  await cleanupTestEnvironment();
});

async function setupTestEnvironment() {
  // Initialize test database, mock services, etc.
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
}

async function cleanupTestEnvironment() {
  // Clean up resources
}
```

## Continuous Integration Testing

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
    
    - name: Install dependencies
      run: bun install
    
    - name: Run linting
      run: bun run lint
    
    - name: Run type checking
      run: bun run type-check
    
    - name: Run unit tests
      run: bun test
    
    - name: Run integration tests
      run: bun test integration/
      env:
        MEXC_API_KEY: ${{ secrets.MEXC_API_KEY }}
        GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
    
    - name: Generate coverage report
      run: bun run test:coverage
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "Running pre-commit checks..."

# Run tests
bun test

# Run linting
bun run lint

# Run type checking
bun run type-check

echo "Pre-commit checks passed!"
```

## Debugging Tests

### Debug Configuration

```typescript
// For debugging specific tests
describe.only('Debug Test', () => {
  it.only('should debug specific issue', async () => {
    console.log('Debug information...');
    // Add debugging code here
  });
});
```

### Test Debugging Tips

1. **Use `console.log()` strategically**:
   ```typescript
   console.log('Input:', JSON.stringify(input, null, 2));
   console.log('Result:', JSON.stringify(result, null, 2));
   ```

2. **Test with real data**:
   ```bash
   MEXC_API_KEY=real_key bun test --verbose
   ```

3. **Isolate failing tests**:
   ```bash
   bun test --grep "specific test name"
   ```

4. **Check test timeouts**:
   ```typescript
   it('should complete within timeout', async () => {
     // Test code here
   }, { timeout: 10000 }); // 10 second timeout
   ```

## Testing Best Practices

### Do's and Don'ts

**Do:**
- ✅ Write tests before implementing features (TDD)
- ✅ Test both success and failure scenarios
- ✅ Use descriptive test names
- ✅ Keep tests isolated and independent
- ✅ Mock external dependencies consistently
- ✅ Test edge cases and boundary conditions
- ✅ Maintain high test coverage for critical paths

**Don't:**
- ❌ Test implementation details instead of behavior
- ❌ Write tests that depend on other tests
- ❌ Ignore flaky tests
- ❌ Mock everything (test real integrations when possible)
- ❌ Write overly complex test setups
- ❌ Skip error handling tests

### Test Naming Conventions

```typescript
// Good test names
it('should return bullish sentiment for positive market indicators')
it('should calculate correct position size with 2% risk')
it('should handle API timeout gracefully')
it('should validate MEXC API key format')

// Poor test names
it('should work')
it('test sentiment')
it('API test')
```

### Test Organization

```typescript
describe('MarketAnalysisService', () => {
  describe('sentiment analysis', () => {
    describe('with valid inputs', () => {
      it('should return bullish sentiment for positive indicators');
      it('should return bearish sentiment for negative indicators');
    });
    
    describe('with invalid inputs', () => {
      it('should reject empty symbol');
      it('should reject invalid price');
    });
  });
  
  describe('technical analysis', () => {
    // Technical analysis tests
  });
});
```

## Resources and Documentation

### Useful Links
- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)

### Project-Specific Resources
- [AI Integration Guide](./ai-integration-guide.md)
- [API Endpoints Documentation](./api-endpoints.md)
- [Configuration Setup Guide](./configuration-setup.md)
- [Usage Examples](./usage-examples.md)

### Test Commands Reference

```bash
# Basic test commands
bun test                           # Run all tests
bun test --watch                   # Run tests in watch mode
bun test --coverage                # Run with coverage
bun test file.test.ts             # Run specific file
bun test --grep "pattern"         # Run tests matching pattern

# Advanced test commands
bun test --reporter=verbose       # Verbose output
bun test --reporter=json          # JSON output
bun test --bail                   # Stop on first failure
bun test --timeout=30000          # Set global timeout

# Integration test commands
bun run test:mexc                 # Real MEXC API tests
bun run test:ai                   # AI integration tests
bun run test:e2e                  # End-to-end tests
```

This testing guide provides comprehensive coverage of testing strategies and best practices for the MEXC MCP server's AI integration features, ensuring robust and reliable AI-enhanced trading capabilities.