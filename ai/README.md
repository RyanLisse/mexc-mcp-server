# AI Service - Gemini 2.5 Flash Integration

This module provides integration with Google's Gemini 2.5 Flash model using the Vercel AI SDK. It's designed as an Encore.ts microservice with proper error handling, rate limiting, and comprehensive testing.

## Features

- **Gemini 2.5 Flash Integration**: Latest Google AI model with advanced capabilities
- **Multiple AI Operations**: Text generation, chat conversations, and structured object generation
- **Rate Limiting**: Built-in rate limiting to prevent API abuse
- **Error Handling**: Comprehensive error handling with meaningful error messages
- **Testing**: Full test suite with mock configurations
- **Type Safety**: Complete TypeScript support with proper interfaces

## Setup

### 1. Install Dependencies

The required packages are already installed:

```bash
# Already installed in package.json
ai@4.3.16
@ai-sdk/google@1.2.19
```

### 2. Environment Variables

Set up your Google AI API key:

```bash
# Required
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here

# Optional (with defaults)
GOOGLE_AI_MODEL=gemini-2.5-flash-preview-05-20
GOOGLE_AI_MAX_TOKENS=8192
GOOGLE_AI_TEMPERATURE=0.7
AI_RATE_LIMIT_MAX_REQUESTS=50
AI_RATE_LIMIT_WINDOW_MS=60000
```

### 3. Get Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Add it to your environment variables

## Usage

### Basic Text Generation

```typescript
import { geminiClient } from './ai/gemini-client';

// Simple text generation
const result = await geminiClient.generateText('Explain blockchain technology');

if (result.success) {
  console.log('Response:', result.data);
  console.log('Tokens used:', result.usage);
} else {
  console.error('Error:', result.error);
}
```

### Chat Conversations

```typescript
import { geminiClient } from './ai/gemini-client';

const messages = [
  {
    role: 'system',
    content: 'You are a helpful cryptocurrency trading assistant.'
  },
  {
    role: 'user',
    content: 'What are the key risk management strategies for crypto trading?'
  }
];

const result = await geminiClient.chat(messages);

if (result.success) {
  console.log('AI Response:', result.data);
}
```

### Structured Object Generation

```typescript
import { geminiClient } from './ai/gemini-client';

const schema = {
  type: 'object',
  properties: {
    strategies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] }
        },
        required: ['name', 'description', 'riskLevel']
      }
    }
  },
  required: ['strategies']
};

const result = await geminiClient.generateObject(
  'List 3 cryptocurrency trading strategies with their risk levels.',
  schema,
  'Trading strategies with risk assessment'
);

if (result.success) {
  console.log('Structured data:', result.data);
}
```

### Using the Encore Service

```typescript
import { aiService } from './ai/encore.service';

// Use within other Encore services
export const myEndpoint = api(
  { expose: true, method: 'POST', path: '/my-ai-endpoint' },
  async (request: { prompt: string }) => {
    const result = await aiService.generateText(request.prompt);
    return result;
  }
);
```

## API Endpoints

The AI service exposes the following HTTP endpoints:

### POST /ai/generate-text
Generate text from a prompt.

**Request Body:**
```json
{
  "prompt": "Your text prompt here"
}
```

**Response:**
```json
{
  "success": true,
  "data": "Generated text response",
  "usage": {
    "promptTokens": 10,
    "completionTokens": 50,
    "totalTokens": 60
  }
}
```

### POST /ai/chat
Chat with conversation history.

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello"
    }
  ]
}
```

### POST /ai/generate-object
Generate structured objects with schema validation.

**Request Body:**
```json
{
  "prompt": "Generate trading strategies",
  "schema": {
    "type": "object",
    "properties": {
      "strategies": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "riskLevel": { "type": "string" }
          }
        }
      }
    }
  },
  "description": "Optional schema description"
}
```

### GET /ai/test
Test the AI service connection and configuration.

### GET /ai/status
Get AI service status and configuration.

### GET /ai/health
Health check endpoint.

## Testing

### Run AI Tests

```bash
# Run AI-specific tests
bun test ai/ai.test.ts

# Run integration test (requires real API key)
bun run test:ai
```

### Test Results

The test suite includes:
- Configuration validation
- Rate limiting tests
- Error handling scenarios
- Response format validation
- API schema validation

Current test coverage: **83% functions, 63% lines**

## Configuration

### Default Configuration

```typescript
{
  model: 'gemini-2.5-flash-preview-05-20',
  maxTokens: 8192,
  temperature: 0.7,
  rateLimit: {
    maxRequests: 50,
    windowMs: 60000  // 1 minute
  }
}
```

### Rate Limiting

The service includes built-in rate limiting:
- Default: 50 requests per minute
- Configurable via environment variables
- Automatic window reset
- Rate limit status tracking

### Error Handling

All methods return consistent response formats:

```typescript
interface GeminiResponse {
  success: boolean;
  data?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

## Security

- API keys are never exposed in logs or responses
- Configuration sanitization removes sensitive data
- Rate limiting prevents abuse
- Input validation for all parameters

## GeminiAnalyzer - Market Data Analysis

The `GeminiAnalyzer` class provides specialized market data analysis capabilities with intelligent caching and budget management.

### Features

- **Market Sentiment Analysis**: Analyze market sentiment from price data and trading indicators
- **Technical Analysis**: Perform comprehensive technical analysis on OHLCV data
- **Risk Assessment**: Evaluate trading position risk with confidence scoring
- **Trend Analysis**: Identify market trends and pattern recognition
- **Intelligent Caching**: Automatic caching with configurable TTL to reduce API costs
- **Budget Management**: Track token usage and costs with configurable limits
- **Error Handling**: Robust error handling with automatic retry mechanisms

### Usage Examples

#### Market Sentiment Analysis

```typescript
import { geminiAnalyzer } from './ai/gemini-analyzer';

const sentimentResult = await geminiAnalyzer.analyzeSentiment({
  symbol: 'BTC_USDT',
  price: 45000,
  volume: 1000000,
  prices: [44000, 44500, 45000, 45200, 45000]
});

if (sentimentResult.success) {
  console.log('Sentiment:', sentimentResult.sentiment); // 'bullish', 'bearish', or 'neutral'
  console.log('Confidence:', sentimentResult.confidence); // 0.0 to 1.0
  console.log('Risk Level:', sentimentResult.riskLevel); // 'low', 'medium', or 'high'
  console.log('Recommendations:', sentimentResult.recommendations);
}
```

#### Technical Analysis

```typescript
const technicalAnalysis = await geminiAnalyzer.performTechnicalAnalysis({
  symbol: 'ETH_USDT',
  ohlcv: [
    { open: 3000, high: 3100, low: 2950, close: 3050, volume: 10000 },
    { open: 3050, high: 3200, low: 3000, close: 3150, volume: 12000 },
    { open: 3150, high: 3250, low: 3100, close: 3200, volume: 11000 }
  ]
});

console.log('Price Action:', technicalAnalysis.priceAction);
console.log('Volume Analysis:', technicalAnalysis.volume);
console.log('Momentum:', technicalAnalysis.momentum);
console.log('Support Levels:', technicalAnalysis.support);
console.log('Resistance Levels:', technicalAnalysis.resistance);
```

#### Risk Assessment

```typescript
const riskAssessment = await geminiAnalyzer.assessRisk({
  symbol: 'BTC_USDT',
  side: 'long',
  size: 0.1,
  entryPrice: 45000,
  currentPrice: 46000,
  marketData: {
    volatility: 0.04,
    volume24h: 1000000000
  }
});

console.log('Risk Level:', riskAssessment.riskLevel);
console.log('Confidence:', riskAssessment.confidence);
console.log('Recommendations:', riskAssessment.recommendations);
```

#### Trend Analysis

```typescript
const trendData = {
  symbol: 'BTC_USDT',
  timeframe: '1h',
  dataPoints: Array.from({ length: 24 }, (_, i) => ({
    timestamp: Date.now() - (23 - i) * 3600000,
    price: 45000 + Math.sin(i / 4) * 1000,
    volume: 1000 + Math.random() * 500
  }))
};

const trendAnalysis = await geminiAnalyzer.analyzeTrend(trendData);

console.log('Trend Direction:', trendAnalysis.direction); // 'up', 'down', or 'sideways'
console.log('Trend Strength:', trendAnalysis.strength); // 0.0 to 1.0
```

### Configuration

```typescript
import { GeminiAnalyzer } from './ai/gemini-analyzer';

const customAnalyzer = new GeminiAnalyzer({
  temperature: 0.5,           // AI creativity level (0.0 to 2.0)
  maxTokensPerRequest: 4096,  // Maximum tokens per request
  cacheTTLMinutes: 30,        // Cache time-to-live in minutes
  budgetLimitUSD: 100,        // Daily budget limit in USD
  retryAttempts: 3,           // Number of retry attempts on failure
  timeoutMs: 30000           // Request timeout in milliseconds
});
```

### Cache Management

```typescript
// Get cache statistics
const cacheStats = geminiAnalyzer.getCacheStats();
console.log('Cache Hit Rate:', cacheStats.hitRate);
console.log('Total Entries:', cacheStats.totalEntries);

// Clear cache
geminiAnalyzer.clearCache();
```

### Budget Tracking

```typescript
// Get budget status
const budgetStatus = geminiAnalyzer.getBudgetStatus();
console.log('Tokens Used:', budgetStatus.tokensUsed);
console.log('Cost USD:', budgetStatus.costUSD);
console.log('Requests Made:', budgetStatus.requestCount);

// Reset budget window
geminiAnalyzer.resetBudgetWindow();
```

### API Endpoints

The analyzer functionality is also exposed via REST API:

- `POST /ai/analyze-sentiment` - Market sentiment analysis
- `POST /ai/technical-analysis` - Technical analysis of OHLCV data  
- `POST /ai/assess-risk` - Trading position risk assessment
- `POST /ai/analyze-trend` - Market trend analysis
- `GET /ai/budget-status` - Get budget and usage statistics
- `GET /ai/cache-stats` - Get cache performance statistics
- `POST /ai/clear-cache` - Clear analysis cache
- `POST /ai/reset-budget` - Reset budget tracking window

## Integration with MCP Protocol

This AI service is designed to work with the Model Context Protocol (MCP) interface implemented in Task #17. It provides the actual AI model capabilities that the MCP server exposes to clients.

## Performance

- Response times: ~200-500ms for text generation
- Token limits: Up to 8,192 tokens per request
- Concurrent request support with proper rate limiting
- Efficient connection reuse

## Troubleshooting

### Common Issues

1. **Invalid API Key Error**
   ```
   Error: API key not valid. Please pass a valid API key.
   ```
   - Verify your `GOOGLE_GENERATIVE_AI_API_KEY` environment variable
   - Check that the API key is active in Google AI Studio

2. **Rate Limit Exceeded**
   ```
   Error: Rate limit exceeded. Maximum 50 requests per 60000ms window.
   ```
   - Wait for the rate limit window to reset
   - Adjust `AI_RATE_LIMIT_MAX_REQUESTS` if needed

3. **Model Not Found**
   ```
   Error: Model 'gemini-2.5-flash-preview-05-20' not found
   ```
   - Check if the model name is correct
   - Update `GOOGLE_AI_MODEL` environment variable

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

## Contributing

When adding new AI capabilities:

1. Add proper TypeScript interfaces
2. Include comprehensive tests
3. Update documentation
4. Follow the existing error handling patterns
5. Ensure rate limiting compliance

## License

MIT License - Same as the parent project.