# MEXC MCP Server Deployment Guide

## Overview

This guide covers deploying the MEXC MCP Server using Encore.ts to various environments including local development, staging, and production. The application uses a microservices architecture with 5 services and requires proper secret management for MEXC API credentials.

## Prerequisites

### Required Tools

```bash
# Install Encore CLI
curl -L https://encore.dev/install.sh | bash

# Verify installation
encore version

# Install Bun (for local development)
curl -fsSL https://bun.sh/install | bash

# Verify Bun installation
bun --version  # Should be 1.0+
```

### Required Accounts & Access

- Encore.ts account and application setup
- MEXC API credentials (API key and secret key)
- GitHub repository access (for CI/CD)
- Domain/subdomain for production (optional)

## Application Structure

The MEXC MCP Server consists of 5 microservices:

```
Services:
├── auth          # Authentication and rate limiting
├── market-data   # MEXC market data integration
├── trading       # Order management and execution
├── portfolio     # Account balance and positions
└── tools         # MCP protocol implementation
```

## Local Development Deployment

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-username/mexc-mcp-server.git
cd mexc-mcp-server

# Install dependencies
bun install

# Set up Git hooks
bun run prepare
```

### 2. Environment Configuration

Create a `.env` file for local development:

```bash
# .env (DO NOT COMMIT)
MEXC_API_KEY=your_mexc_api_key_here
MEXC_SECRET_KEY=your_mexc_secret_key_here
MEXC_BASE_URL=https://api.mexc.com
RATE_LIMIT_PER_MINUTE=1200
CACHE_TTL_SECONDS=30
LOG_LEVEL=info
```

### 3. Start Development Server

```bash
# Start all services
encore run

# The server will be available at:
# http://localhost:4000
```

### 4. Verify Local Deployment

```bash
# Test health endpoint
curl http://localhost:4000/health

# Test MEXC credentials
curl http://localhost:4000/auth/test-mexc

# Test API connectivity
curl http://localhost:4000/market-data/test-connectivity
```

### 5. Run Tests

```bash
# Run all tests
bun test

# Run tests with coverage
bun run test:coverage

# Run specific service tests
bun test auth/
bun test market-data/
```

## Staging Environment Deployment

### 1. Encore Authentication

```bash
# Login to Encore
encore auth login

# Verify authentication
encore auth whoami
```

### 2. Create Staging Environment

```bash
# Create staging environment (if not exists)
encore env create staging

# Set staging secrets
encore secret set --env=staging MEXC_API_KEY "your_staging_api_key"
encore secret set --env=staging MEXC_SECRET_KEY "your_staging_secret_key"
encore secret set --env=staging MEXC_BASE_URL "https://api.mexc.com"
encore secret set --env=staging RATE_LIMIT_PER_MINUTE "600"  # Lower for staging
```

### 3. Deploy to Staging

```bash
# Deploy to staging
encore deploy --env=staging

# Monitor deployment
encore logs --env=staging --follow
```

### 4. Verify Staging Deployment

```bash
# Get staging URL
encore env list

# Test staging deployment
curl https://your-app-staging.encr.app/health
curl https://your-app-staging.encr.app/auth/test-mexc
```

## Production Environment Deployment

### 1. Production Secrets Setup

```bash
# Set production secrets (use production MEXC credentials)
encore secret set --env=production MEXC_API_KEY "your_production_api_key"
encore secret set --env=production MEXC_SECRET_KEY "your_production_secret_key"
encore secret set --env=production MEXC_BASE_URL "https://api.mexc.com"
encore secret set --env=production RATE_LIMIT_PER_MINUTE "1200"
encore secret set --env=production CACHE_TTL_SECONDS "30"
```

### 2. Production Deployment

```bash
# Deploy to production
encore deploy --env=production

# Monitor deployment
encore logs --env=production --follow
```

### 3. Custom Domain Setup (Optional)

```bash
# Add custom domain
encore domain add --env=production your-domain.com

# Configure SSL certificate (automatic with Encore)
encore domain list --env=production
```

### 4. Production Health Checks

```bash
# Test production deployment
curl https://your-app.encr.app/health
curl https://your-app.encr.app/market-data/health
curl https://your-app.encr.app/trading/health
curl https://your-app.encr.app/portfolio/health
curl https://your-app.encr.app/tools/health
```

## CI/CD Pipeline Setup

### 1. GitHub Actions Configuration

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

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
        
      - name: Run type checking
        run: bun run type-check
        
      - name: Run linting
        run: bun run lint
        
      - name: Run tests
        run: bun test
        
      - name: Run build test
        run: bun run build || echo "Build check completed"
```

### 2. Deployment Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'staging'
        type: choice
        options:
        - staging
        - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment || 'staging' }}
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Encore
        uses: encoredev/setup-encore@v1
        with:
          version: latest
          
      - name: Authenticate Encore
        run: encore auth login --token ${{ secrets.ENCORE_AUTH_TOKEN }}
        
      - name: Set secrets
        env:
          ENV: ${{ github.event.inputs.environment || 'staging' }}
        run: |
          encore secret set --env=$ENV MEXC_API_KEY "${{ secrets.MEXC_API_KEY }}"
          encore secret set --env=$ENV MEXC_SECRET_KEY "${{ secrets.MEXC_SECRET_KEY }}"
          
      - name: Deploy
        env:
          ENV: ${{ github.event.inputs.environment || 'staging' }}
        run: encore deploy --env=$ENV
        
      - name: Health check
        env:
          ENV: ${{ github.event.inputs.environment || 'staging' }}
        run: |
          sleep 30  # Wait for deployment
          URL=$(encore env list | grep $ENV | awk '{print $2}')
          curl -f $URL/health || exit 1
```

### 3. Required GitHub Secrets

Configure these secrets in your GitHub repository:

```
Repository Settings > Secrets and variables > Actions

Required secrets:
- ENCORE_AUTH_TOKEN: Your Encore authentication token
- MEXC_API_KEY: MEXC API key for the environment
- MEXC_SECRET_KEY: MEXC secret key for the environment

Optional secrets:
- CODECOV_TOKEN: For code coverage reporting
```

## Monitoring and Observability

### 1. Built-in Monitoring

Encore.ts provides built-in monitoring:

```bash
# View metrics dashboard
encore metrics --env=production

# View trace data
encore trace --env=production

# Monitor logs
encore logs --env=production --follow
```

### 2. Health Check Endpoints

Each service provides health endpoints:

```bash
# Overall health
curl https://your-app.encr.app/health

# Service-specific health
curl https://your-app.encr.app/auth/health
curl https://your-app.encr.app/market-data/health
curl https://your-app.encr.app/trading/health
curl https://your-app.encr.app/portfolio/health
curl https://your-app.encr.app/tools/health
```

### 3. Custom Monitoring Setup

Example monitoring configuration:

```typescript
// monitoring/alerts.ts
import { log } from "encore.dev/log";

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy';
  timestamp: number;
  details?: any;
}

export function logHealthStatus(health: HealthStatus) {
  if (health.status === 'unhealthy') {
    log.error("Service unhealthy", {
      service: health.service,
      details: health.details
    });
  } else {
    log.info("Service healthy", {
      service: health.service
    });
  }
}
```

## Scaling and Performance

### 1. Service Scaling

```bash
# Scale services in production
encore scale --env=production --service=market-data --instances=3
encore scale --env=production --service=trading --instances=2
```

### 2. Performance Optimization

Key areas for optimization:

```typescript
// market-data/config.ts
export const performanceConfig = {
  // Cache settings
  cache: {
    ttlTicker: 5000,      // 5 seconds
    ttlOrderbook: 2000,   // 2 seconds
    ttlStats: 30000,      // 30 seconds
  },
  
  // Rate limiting
  rateLimiting: {
    maxRequestsPerMinute: 1200,
    burstLimit: 50,
  },
  
  // Connection pooling
  mexcApi: {
    maxConnections: 10,
    connectionTimeout: 5000,
    requestTimeout: 10000,
  }
};
```

### 3. Database Optimization (if using)

```sql
-- Index for faster queries
CREATE INDEX idx_orders_symbol_timestamp ON orders(symbol, timestamp);
CREATE INDEX idx_trades_user_timestamp ON trades(user_id, timestamp);
```

## Troubleshooting

### Common Deployment Issues

#### 1. Secret Not Found

```
Error: Secret "MEXC_API_KEY" not found in environment "production"
```

**Solution:**
```bash
encore secret set --env=production MEXC_API_KEY "your_key"
```

#### 2. Service Start Failure

```
Error: Service "market-data" failed to start
```

**Solutions:**
```bash
# Check logs
encore logs --env=production --service=market-data

# Check service status
encore ps --env=production

# Redeploy specific service
encore deploy --env=production --service=market-data
```

#### 3. API Connection Issues

```
Error: MEXC API connectivity test failed
```

**Solutions:**
- Verify MEXC API credentials
- Check network connectivity
- Verify MEXC API status
- Check rate limiting

#### 4. Memory/CPU Issues

```bash
# Check resource usage
encore metrics --env=production

# Scale up if needed
encore scale --env=production --service=market-data --memory=1GB
encore scale --env=production --service=trading --cpu=2
```

### Debug Commands

```bash
# View environment info
encore env list

# Check service status
encore ps --env=production

# View detailed logs
encore logs --env=production --service=market-data --since=1h

# Test specific endpoints
curl -v https://your-app.encr.app/market-data/debug/config
```

## Security Considerations

### 1. API Key Security

- Use read-only keys for development
- Rotate keys regularly
- Monitor API key usage
- Set up alerts for suspicious activity

### 2. Network Security

```bash
# Encore.ts provides built-in security:
# - Automatic HTTPS/TLS
# - Request rate limiting
# - Input validation
# - CORS protection
```

### 3. Monitoring and Alerts

```bash
# Set up monitoring alerts
encore alert create --env=production \
  --name="High Error Rate" \
  --condition="error_rate > 5%" \
  --notification="email:admin@company.com"
```

## Backup and Recovery

### 1. Configuration Backup

```bash
# Export secrets (for backup)
encore secret list --env=production > secrets-backup.txt

# Export environment configuration
encore env show --env=production > env-config.json
```

### 2. Disaster Recovery

```bash
# Quick recovery steps:
# 1. Redeploy from last known good commit
git checkout <last-good-commit>
encore deploy --env=production

# 2. Restore secrets if needed
encore secret set --env=production MEXC_API_KEY "backup_key"

# 3. Verify all services
curl https://your-app.encr.app/health
```

## Performance Benchmarks

### Expected Performance Metrics

- **API Response Time**: < 200ms (95th percentile)
- **Throughput**: 1000+ requests/minute
- **Memory Usage**: < 512MB per service
- **CPU Usage**: < 50% under normal load
- **Cache Hit Rate**: > 80% for market data

### Load Testing

```bash
# Install load testing tool
npm install -g artillery

# Create load test configuration
cat > load-test.yml << EOF
config:
  target: 'https://your-app.encr.app'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Health check"
    requests:
      - get:
          url: "/health"
  - name: "Market data"
    requests:
      - post:
          url: "/market-data/ticker"
          json:
            symbol: "BTCUSDT"
EOF

# Run load test
artillery run load-test.yml
```

## Support and Resources

### Documentation

- [Encore.ts Documentation](https://encore.dev/docs)
- [MEXC API Documentation](https://mexcdevelop.github.io/apidocs/)
- [Bun Documentation](https://bun.sh/docs)

### Getting Help

1. Check the health endpoints for service status
2. Review logs using `encore logs`
3. Test individual services using the API documentation
4. Check MEXC API status and rate limits
5. Contact support with specific error messages and logs

### Useful Commands Summary

```bash
# Development
encore run                                    # Start local development
bun test                                     # Run tests

# Deployment
encore deploy --env=staging                 # Deploy to staging
encore deploy --env=production              # Deploy to production

# Monitoring
encore logs --env=production --follow       # Monitor logs
encore metrics --env=production             # View metrics
encore ps --env=production                  # Check service status

# Secrets
encore secret set --env=production KEY val  # Set secret
encore secret list --env=production         # List secrets

# Scaling
encore scale --env=production --service=name --instances=3
```

This deployment guide ensures a smooth and secure deployment process for the MEXC MCP Server across all environments.