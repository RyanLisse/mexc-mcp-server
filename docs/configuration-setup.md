# Configuration Setup Guide

This guide provides detailed instructions for configuring the MEXC MCP server with AI integration capabilities.

## Prerequisites

Before setting up the configuration, ensure you have:

1. **Node.js 18+** or **Bun runtime** installed
2. **MEXC exchange account** with API access
3. **Google Cloud Platform account** with Gemini API access
4. **Git** for version control
5. **Text editor** or IDE for configuration

## Environment Variables

### Overview

The MEXC MCP server uses environment variables for secure configuration management. All sensitive information should be stored in environment variables, never in code.

### Required Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# MEXC API Configuration
MEXC_API_KEY=mx_your_api_key_here
MEXC_SECRET_KEY=your_secret_key_here
MEXC_BASE_URL=https://api.mexc.com

# Google Gemini API Configuration
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-preview-05-20

# Server Configuration
PORT=4000
NODE_ENV=development
LOG_LEVEL=info

# AI Service Configuration
AI_BUDGET_DAILY_USD=10.00
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=4096
AI_CACHE_TTL_MINUTES=15

# Rate Limiting Configuration
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_BURST_SIZE=10

# Health Check Configuration
HEALTH_CHECK_INTERVAL_MS=30000
HEALTH_CHECK_TIMEOUT_MS=5000
```

### Optional Environment Variables

```bash
# Development/Testing Configuration
DEBUG_MODE=false
MOCK_AI_RESPONSES=false
DISABLE_RATE_LIMITING=false

# Monitoring and Observability
ENABLE_METRICS=true
METRICS_PORT=9090
ENABLE_TRACING=false

# Advanced AI Configuration
AI_CONFIDENCE_THRESHOLD=0.7
AI_MAX_RETRIES=3
AI_RETRY_DELAY_MS=1000
AI_CIRCUIT_BREAKER_THRESHOLD=5

# MEXC Specific Configuration
MEXC_TIMEOUT_MS=10000
MEXC_MAX_RETRIES=3
MEXC_LEVERAGE_ENABLED=true
MEXC_MAX_LEVERAGE=125
```

## Obtaining API Keys

### MEXC API Key Setup

1. **Create MEXC Account**:
   - Visit [MEXC Global](https://mexc.com)
   - Sign up for an account
   - Complete KYC verification

2. **Generate API Keys**:
   - Navigate to Account → API Management
   - Click "Create API Key"
   - Set API Key Label (e.g., "MCP Server")
   - Configure permissions:
     - ✅ **Read**: Enable for market data access
     - ✅ **Trade**: Enable for trading functionality (if needed)
     - ❌ **Withdraw**: Disable for security
   - Set IP restrictions (recommended for production)
   - Save your API Key and Secret Key securely

3. **API Key Format Validation**:
   ```typescript
   // MEXC API keys should match this pattern:
   const API_KEY_PATTERN = /^mx[a-zA-Z0-9_]{30,}$/;
   
   // Example valid key:
   // mx_1234567890abcdef1234567890abcdef
   ```

### Gemini API Key Setup

1. **Create Google Cloud Account**:
   - Visit [Google Cloud Console](https://console.cloud.google.com)
   - Sign up or log in to your account
   - Create a new project or select existing one

2. **Enable Gemini API**:
   - Navigate to APIs & Services → Library
   - Search for "Gemini API" or "Generative AI"
   - Click "Enable" on the Gemini API

3. **Create API Credentials**:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key
   - Optionally restrict the key to Gemini API only

4. **Set Up Billing** (Required):
   - Navigate to Billing in Cloud Console
   - Set up a billing account
   - Link billing account to your project
   - Set budget alerts (recommended: $10-50/month)

## Environment-Specific Configuration

### Development Environment

Create `.env.development`:

```bash
# Development Configuration
NODE_ENV=development
PORT=4000
LOG_LEVEL=debug

# Relaxed rate limiting for development
RATE_LIMIT_REQUESTS_PER_MINUTE=1000
DISABLE_RATE_LIMITING=false

# Development AI settings
AI_BUDGET_DAILY_USD=5.00
AI_TEMPERATURE=0.5
MOCK_AI_RESPONSES=false
DEBUG_MODE=true

# Development MEXC settings
MEXC_TIMEOUT_MS=15000
MEXC_BASE_URL=https://api.mexc.com

# Enable all development features
ENABLE_METRICS=true
ENABLE_TRACING=true
```

### Staging Environment

Create `.env.staging`:

```bash
# Staging Configuration
NODE_ENV=staging
PORT=4000
LOG_LEVEL=info

# Production-like rate limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=200
RATE_LIMIT_BURST_SIZE=20

# Staging AI settings
AI_BUDGET_DAILY_USD=15.00
AI_TEMPERATURE=0.7
AI_CONFIDENCE_THRESHOLD=0.75

# Staging MEXC settings
MEXC_TIMEOUT_MS=10000
MEXC_MAX_RETRIES=3

# Monitoring enabled
ENABLE_METRICS=true
HEALTH_CHECK_INTERVAL_MS=15000
```

### Production Environment

Create `.env.production`:

```bash
# Production Configuration
NODE_ENV=production
PORT=4000
LOG_LEVEL=warn

# Strict rate limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_BURST_SIZE=5

# Production AI settings
AI_BUDGET_DAILY_USD=25.00
AI_TEMPERATURE=0.7
AI_MAX_RETRIES=5
AI_CIRCUIT_BREAKER_THRESHOLD=3

# Production MEXC settings
MEXC_TIMEOUT_MS=8000
MEXC_MAX_RETRIES=2
MEXC_LEVERAGE_ENABLED=false

# Production monitoring
ENABLE_METRICS=true
HEALTH_CHECK_INTERVAL_MS=30000
HEALTH_CHECK_TIMEOUT_MS=3000
```

## Security Best Practices

### API Key Management

1. **Environment Variables Only**:
   - Never hardcode API keys in source code
   - Use environment variables for all sensitive data
   - Add `.env*` files to `.gitignore`

2. **Key Rotation**:
   - Rotate MEXC API keys every 90 days
   - Rotate Gemini API keys every 180 days
   - Update keys in all environments simultaneously
   - Test key rotation in staging first

3. **Access Control**:
   - Use separate API keys for each environment
   - Restrict MEXC API key permissions to minimum required
   - Set IP restrictions for production API keys
   - Monitor API key usage regularly

### Network Security

1. **HTTPS Only**:
   - Always use HTTPS in production
   - Disable HTTP redirects to HTTPS
   - Use TLS 1.2 or higher

2. **Rate Limiting**:
   - Implement progressive rate limiting
   - Use IP-based and API key-based limits
   - Set up DDoS protection for production

3. **Input Validation**:
   - Validate all API inputs
   - Sanitize user data before AI processing
   - Implement request size limits

### Monitoring and Alerting

1. **Budget Monitoring**:
   ```bash
   # Set up budget alerts
   AI_BUDGET_ALERT_THRESHOLD_USD=8.00
   AI_BUDGET_CRITICAL_THRESHOLD_USD=9.50
   
   # Email notifications
   ALERT_EMAIL=admin@yourcompany.com
   CRITICAL_ALERT_EMAIL=security@yourcompany.com
   ```

2. **Error Monitoring**:
   ```bash
   # Error tracking
   ERROR_RATE_THRESHOLD=0.05
   ERROR_ALERT_INTERVAL_MINUTES=15
   
   # Health check alerts
   HEALTH_CHECK_FAILURE_THRESHOLD=3
   HEALTH_CHECK_ALERT_COOLDOWN_MINUTES=10
   ```

## Configuration Validation

### Startup Validation

The server validates configuration on startup:

```typescript
// Configuration validation checklist:
✅ MEXC API key format and accessibility
✅ Gemini API key validity and quota
✅ Environment variable completeness
✅ Network connectivity to external APIs
✅ Database/cache connectivity (if applicable)
✅ Required file permissions
```

### Validation Script

Run the configuration validation script:

```bash
# Validate current configuration
bun run validate-config

# Validate specific environment
NODE_ENV=production bun run validate-config

# Test API connectivity
bun run test-connectivity
```

### Manual Validation

1. **Test MEXC API Connection**:
   ```bash
   curl -H "X-MEXC-APIKEY: $MEXC_API_KEY" \
        "https://api.mexc.com/api/v3/ping"
   ```

2. **Test Gemini API Connection**:
   ```bash
   curl -H "Content-Type: application/json" \
        -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$GOOGLE_API_KEY"
   ```

## Troubleshooting

### Common Configuration Issues

#### MEXC API Key Issues

**Problem**: `Invalid API key format`
```bash
# Solution: Check API key format
echo $MEXC_API_KEY | grep -E '^mx[a-zA-Z0-9_]{30,}$'
```

**Problem**: `MEXC API authentication failed`
```bash
# Solution: Verify API key permissions and IP restrictions
# Check MEXC account → API Management → Key Details
```

**Problem**: `MEXC API rate limit exceeded`
```bash
# Solution: Reduce request frequency or upgrade API limits
RATE_LIMIT_REQUESTS_PER_MINUTE=50
MEXC_TIMEOUT_MS=12000
```

#### Gemini API Key Issues

**Problem**: `Gemini API quota exceeded`
```bash
# Solution: Check billing and increase budget
AI_BUDGET_DAILY_USD=20.00
AI_MAX_TOKENS=2048  # Reduce token usage
```

**Problem**: `Gemini API authentication failed`
```bash
# Solution: Verify API key and project configuration
# Check Google Cloud Console → APIs & Services → Credentials
```

**Problem**: `Gemini API not enabled`
```bash
# Solution: Enable Generative AI API in Google Cloud Console
# Navigate to APIs & Services → Library → Enable Gemini API
```

#### Network and Connectivity Issues

**Problem**: `Connection timeout to MEXC API`
```bash
# Solution: Increase timeout and retry settings
MEXC_TIMEOUT_MS=15000
MEXC_MAX_RETRIES=5
```

**Problem**: `SSL certificate errors`
```bash
# Solution: Update Node.js/Bun or disable SSL verification (dev only)
NODE_TLS_REJECT_UNAUTHORIZED=0  # Development only!
```

### Environment-Specific Issues

#### Development Issues

- **Hot reload not working**: Check file watchers and permissions
- **Debug logs not showing**: Set `LOG_LEVEL=debug` and `DEBUG_MODE=true`
- **Mock responses enabled**: Verify `MOCK_AI_RESPONSES=false` for real API testing

#### Staging Issues

- **Different behavior than dev**: Compare `.env.development` and `.env.staging`
- **Performance issues**: Check rate limiting and timeout settings
- **Budget exceeded**: Monitor usage and adjust `AI_BUDGET_DAILY_USD`

#### Production Issues

- **High latency**: Optimize timeouts and enable caching
- **Rate limiting too strict**: Adjust limits based on actual usage
- **Memory leaks**: Monitor memory usage and enable garbage collection

### Diagnostic Commands

```bash
# Check all environment variables
bun run config:check

# Test external API connectivity
bun run test:connectivity

# Validate configuration against schema
bun run validate:config

# Run health checks
curl http://localhost:4000/mcp/health

# Check service logs
tail -f logs/app.log

# Monitor resource usage
bun run monitor:resources
```

## Configuration Schema

### TypeScript Configuration Interface

```typescript
interface AppConfig {
  // Server Configuration
  port: number;
  nodeEnv: 'development' | 'staging' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // MEXC Configuration
  mexc: {
    apiKey: string;
    secretKey: string;
    baseUrl: string;
    timeout: number;
    maxRetries: number;
    leverageEnabled: boolean;
    maxLeverage: number;
  };

  // Gemini Configuration
  gemini: {
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
    confidenceThreshold: number;
  };

  // AI Service Configuration
  ai: {
    budgetDailyUSD: number;
    cacheTTLMinutes: number;
    maxRetries: number;
    retryDelayMs: number;
    circuitBreakerThreshold: number;
  };

  // Rate Limiting Configuration
  rateLimit: {
    requestsPerMinute: number;
    burstSize: number;
    enabled: boolean;
  };

  // Health Check Configuration
  healthCheck: {
    intervalMs: number;
    timeoutMs: number;
    failureThreshold: number;
  };
}
```

### Environment Variable Mapping

```typescript
const config: AppConfig = {
  port: parseInt(process.env.PORT || '4000'),
  nodeEnv: process.env.NODE_ENV as any || 'development',
  logLevel: process.env.LOG_LEVEL as any || 'info',
  
  mexc: {
    apiKey: process.env.MEXC_API_KEY!,
    secretKey: process.env.MEXC_SECRET_KEY!,
    baseUrl: process.env.MEXC_BASE_URL || 'https://api.mexc.com',
    timeout: parseInt(process.env.MEXC_TIMEOUT_MS || '10000'),
    maxRetries: parseInt(process.env.MEXC_MAX_RETRIES || '3'),
    leverageEnabled: process.env.MEXC_LEVERAGE_ENABLED === 'true',
    maxLeverage: parseInt(process.env.MEXC_MAX_LEVERAGE || '125'),
  },
  
  gemini: {
    apiKey: process.env.GOOGLE_API_KEY!,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-05-20',
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096'),
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.7'),
  },
  
  // ... additional configuration mapping
};
```

## Getting Help

### Documentation Resources
- [API Endpoints Documentation](./api-endpoints.md)
- [Usage Examples](./usage-examples.md)
- [Testing Guide](./testing-guide.md)
- [AI Integration Guide](./ai-integration-guide.md)

### Support Channels
- **GitHub Issues**: Technical problems and feature requests
- **Discord/Slack**: Community support and discussions
- **Email Support**: security@yourcompany.com for security issues

### Useful Links
- [MEXC API Documentation](https://mexcdevelop.github.io/apidocs/spot_v3_en/)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Encore.ts Documentation](https://encore.dev/docs)
- [Bun Documentation](https://bun.sh/docs)