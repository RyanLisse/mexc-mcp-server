# Secrets Management Setup Guide

## Overview

The MEXC MCP Server uses Encore.ts built-in secrets management for secure credential storage and environment-specific configuration. This guide covers setting up secrets for local development, staging, and production environments.

## Prerequisites

- [Encore CLI](https://encore.dev/docs/install) installed and authenticated
- MEXC API credentials (API key and secret key)
- Access to the Encore.ts application

## Secret Configuration

### Required Secrets

The application requires the following secrets:

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `MEXC_API_KEY` | MEXC exchange API key | Yes |
| `MEXC_SECRET_KEY` | MEXC exchange secret key | Yes |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI API key for Gemini 2.5 Flash | Yes |

### Optional Secrets

| Secret Name | Description | Default |
|-------------|-------------|---------|
| `MEXC_BASE_URL` | MEXC API base URL | `https://api.mexc.com` |
| `RATE_LIMIT_PER_MINUTE` | API rate limit | `1200` |
| `CACHE_TTL_SECONDS` | Cache TTL for market data | `30` |
| `GOOGLE_AI_MODEL` | Google AI model name | `gemini-2.5-flash-preview-05-20` |
| `GOOGLE_AI_MAX_TOKENS` | Maximum tokens for AI responses | `8192` |
| `GOOGLE_AI_TEMPERATURE` | AI response creativity (0-2) | `0.7` |
| `AI_RATE_LIMIT_MAX_REQUESTS` | AI API rate limit | `50` |
| `AI_RATE_LIMIT_WINDOW_MS` | AI rate limit window in ms | `60000` |

## Local Development Setup

### Method 1: Environment Variables (Recommended for Local)

Create a `.env` file in your project root:

```bash
# .env
MEXC_API_KEY=your_mexc_api_key_here
MEXC_SECRET_KEY=your_mexc_secret_key_here
MEXC_BASE_URL=https://api.mexc.com
RATE_LIMIT_PER_MINUTE=1200
CACHE_TTL_SECONDS=30

# Google AI Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here
GOOGLE_AI_MODEL=gemini-2.5-flash-preview-05-20
GOOGLE_AI_MAX_TOKENS=8192
GOOGLE_AI_TEMPERATURE=0.7
AI_RATE_LIMIT_MAX_REQUESTS=50
AI_RATE_LIMIT_WINDOW_MS=60000
```

**Important**: Never commit the `.env` file to version control. It's already included in `.gitignore`.

### Method 2: Encore Local Secrets

Set local secrets using the Encore CLI:

```bash
# Set local development secrets
encore secret set --env=local MEXC_API_KEY "your_api_key"
encore secret set --env=local MEXC_SECRET_KEY "your_secret_key"

# Optional configuration
encore secret set --env=local MEXC_BASE_URL "https://api.mexc.com"
encore secret set --env=local RATE_LIMIT_PER_MINUTE "1200"
encore secret set --env=local CACHE_TTL_SECONDS "30"
```

## Staging Environment Setup

Set up secrets for the staging environment:

```bash
# Required secrets for staging
encore secret set --env=staging MEXC_API_KEY "your_staging_api_key"
encore secret set --env=staging MEXC_SECRET_KEY "your_staging_secret_key"

# Optional configuration for staging
encore secret set --env=staging MEXC_BASE_URL "https://api.mexc.com"
encore secret set --env=staging RATE_LIMIT_PER_MINUTE "600"  # Lower limit for staging
encore secret set --env=staging CACHE_TTL_SECONDS "30"
```

## Production Environment Setup

Set up secrets for the production environment:

```bash
# Required secrets for production
encore secret set --env=production MEXC_API_KEY "your_production_api_key"
encore secret set --env=production MEXC_SECRET_KEY "your_production_secret_key"

# Optional configuration for production
encore secret set --env=production MEXC_BASE_URL "https://api.mexc.com"
encore secret set --env=production RATE_LIMIT_PER_MINUTE "1200"
encore secret set --env=production CACHE_TTL_SECONDS "30"
```

## Secret Usage in Code

### Basic Usage

```typescript
// shared/config.ts
import { secret } from "encore.dev/config";

// Define secrets
const mexcApiKey = secret("MEXC_API_KEY");
const mexcSecretKey = secret("MEXC_SECRET_KEY");

// Optional secrets with defaults
const mexcBaseUrl = secret("MEXC_BASE_URL");
const rateLimitPerMinute = secret("RATE_LIMIT_PER_MINUTE");

// Export configuration
export const config = {
  mexc: {
    apiKey: mexcApiKey(),
    secretKey: mexcSecretKey(),
    baseUrl: mexcBaseUrl() || "https://api.mexc.com",
    rateLimitPerMinute: parseInt(rateLimitPerMinute() || "1200"),
  }
};
```

### Environment-Aware Configuration

```typescript
// shared/config.ts
import { secret } from "encore.dev/config";

// Secrets
const mexcApiKey = secret("MEXC_API_KEY");
const mexcSecretKey = secret("MEXC_SECRET_KEY");

// Environment detection
const isProduction = process.env.ENCORE_ENV === "production";
const isStaging = process.env.ENCORE_ENV === "staging";
const isDevelopment = process.env.ENCORE_ENV === "development" || !process.env.ENCORE_ENV;

// Environment-specific configuration
export const config = {
  environment: {
    isProduction,
    isStaging,
    isDevelopment,
  },
  mexc: {
    // Use secrets in cloud environments, fallback to env vars locally
    apiKey: mexcApiKey() || process.env.MEXC_API_KEY,
    secretKey: mexcSecretKey() || process.env.MEXC_SECRET_KEY,
    baseUrl: "https://api.mexc.com",
    rateLimitPerMinute: isProduction ? 1200 : 600, // Lower rate limit for non-prod
  },
  cache: {
    ttlTicker: isDevelopment ? 10000 : 5000,      // Longer cache in dev
    ttlOrderbook: isDevelopment ? 5000 : 2000,
    ttlStats: isDevelopment ? 60000 : 30000,
  }
};
```

## Security Best Practices

### 1. API Key Management

```bash
# Use different API keys for different environments
# Production: Full trading permissions
# Staging: Limited trading or read-only
# Development: Read-only or demo account
```

### 2. Secret Rotation

```bash
# Rotate secrets regularly
encore secret set --env=production MEXC_API_KEY "new_api_key"
encore secret set --env=production MEXC_SECRET_KEY "new_secret_key"

# Deploy to apply new secrets
encore deploy --env=production
```

### 3. Access Control

```bash
# List who has access to secrets
encore secret list --env=production

# View secret metadata (not values)
encore secret get --env=production MEXC_API_KEY
```

## Verification and Testing

### Test Secret Configuration

```typescript
// test/secrets.test.ts
import { config } from "../shared/config";

describe("Secrets Configuration", () => {
  it("should have required MEXC credentials", () => {
    expect(config.mexc.apiKey).toBeDefined();
    expect(config.mexc.secretKey).toBeDefined();
    expect(config.mexc.apiKey).not.toBe("");
    expect(config.mexc.secretKey).not.toBe("");
  });

  it("should have valid API key format", () => {
    // MEXC API keys typically start with 'mx0v'
    expect(config.mexc.apiKey).toMatch(/^mx0v/);
  });

  it("should have valid base URL", () => {
    expect(config.mexc.baseUrl).toMatch(/^https:\/\/api\.mexc\.com/);
  });
});
```

### API Connectivity Test

Use the built-in test endpoint to verify credentials:

```bash
# Test MEXC credentials
curl -X GET "http://localhost:4000/auth/test-mexc"

# Expected response for configured credentials:
{
  "hasCredentials": true,
  "message": "MEXC API credentials are configured"
}
```

### Test API Authentication

```bash
# Test actual MEXC API authentication
curl -X GET "http://localhost:4000/market-data/test-auth"

# Expected response for valid credentials:
{
  "data": {
    "success": true,
    "message": "Authentication successful"
  },
  "timestamp": 1640995200000
}
```

## Troubleshooting

### Common Issues

#### 1. Secret Not Found Error

```
Error: Secret "MEXC_API_KEY" not found
```

**Solution:**
```bash
# Check if secret exists
encore secret list --env=development

# Set the secret if missing
encore secret set --env=development MEXC_API_KEY "your_api_key"
```

#### 2. Invalid API Key Format

```
Error: Invalid MEXC API key format
```

**Solution:**
- Verify the API key from MEXC dashboard
- Ensure no extra spaces or characters
- MEXC API keys typically start with 'mx0v'

#### 3. Authentication Failed

```
Error: Authentication test failed
```

**Solution:**
- Check API key permissions in MEXC dashboard
- Verify secret key matches the API key
- Ensure API key is not expired or suspended

#### 4. Environment Variables Not Loading

**Solution:**
```bash
# Check if .env file exists and is properly formatted
cat .env

# Restart the development server
encore run
```

### Debug Commands

```bash
# List all secrets for an environment (shows names, not values)
encore secret list --env=development

# Get secret metadata
encore secret get --env=development MEXC_API_KEY

# Test configuration endpoint
curl -X GET "http://localhost:4000/market-data/debug/config"
```

## CI/CD Integration

### GitHub Actions Setup

```yaml
# .github/workflows/deploy.yml
name: Deploy to Encore

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Encore
        uses: encoredev/setup-encore@v1
        with:
          version: latest
          
      - name: Authenticate Encore
        run: encore auth login --token ${{ secrets.ENCORE_AUTH_TOKEN }}
        
      - name: Set Production Secrets
        run: |
          encore secret set --env=production MEXC_API_KEY "${{ secrets.MEXC_API_KEY }}"
          encore secret set --env=production MEXC_SECRET_KEY "${{ secrets.MEXC_SECRET_KEY }}"
          
      - name: Deploy
        run: encore deploy --env=production
```

### Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

```
ENCORE_AUTH_TOKEN=your_encore_auth_token
MEXC_API_KEY=your_production_mexc_api_key
MEXC_SECRET_KEY=your_production_mexc_secret_key
```

## Security Checklist

- [ ] Never commit secrets to version control
- [ ] Use different API keys for different environments
- [ ] Regularly rotate API keys
- [ ] Use read-only keys for development when possible
- [ ] Monitor API key usage and rate limits
- [ ] Set up alerts for authentication failures
- [ ] Restrict API key permissions to minimum required
- [ ] Use secure channels for secret distribution
- [ ] Regularly audit secret access logs
- [ ] Have a key revocation process for compromised keys

## Support

If you encounter issues with secrets management:

1. Check the [Encore.ts Secrets Documentation](https://encore.dev/docs/develop/secrets)
2. Review the [MEXC API Documentation](https://mexcdevelop.github.io/apidocs/)
3. Test with the built-in diagnostic endpoints
4. Contact support with specific error messages and environment details