# Encore Secrets Management Guide

## Overview

This MEXC MCP Server uses Encore.ts's built-in secrets management system for secure handling of sensitive configuration like API keys and credentials.

## Available Secrets

### Primary Secrets
- `MEXC_API_KEY` - Your MEXC exchange API key (format: mx0v...)
- `MEXC_SECRET_KEY` - Your MEXC exchange secret key (32+ character hex)

### Future Secrets (Ready for Extension)
- `JWTSecret` - JWT signing secret for authentication
- `EncryptionKey` - Data encryption key
- `SentryDSN` - Error monitoring DSN
- `LogLevel` - Application log level

## Setting Secrets

### Development Environment
```bash
# Set development secrets
echo "your_api_key" | encore secret set --type dev,local MEXC_API_KEY
echo "your_secret_key" | encore secret set --type dev,local MEXC_SECRET_KEY
```

### Production Environment
```bash
# Set production secrets
echo "your_production_api_key" | encore secret set --type production MEXC_API_KEY
echo "your_production_secret_key" | encore secret set --type production MEXC_SECRET_KEY
```

### From File
```bash
# Set secret from file
encore secret set --type dev,local MEXC_API_KEY < api_key.txt
```

## Local Development Override

For local development, you can create a `.secrets.local.cue` file:

```cue
// .secrets.local.cue
MEXC_API_KEY: "mx0v_your_local_dev_key"
MEXC_SECRET_KEY: "your_local_dev_secret"
```

**Note**: This file is automatically ignored by git.

## Usage in Code

### Import and Use Secrets
```typescript
import { getMexcCredentials } from './shared/secrets';

// Get credentials safely
const { apiKey, secretKey } = getMexcCredentials();

// Use in API calls
const response = await mexcApi.call({
  headers: {
    'X-MEXC-APIKEY': apiKey,
    // ... other headers
  }
});
```

### Check Credential Availability
```typescript
import { hasMexcCredentials } from './shared/secrets';

if (hasMexcCredentials()) {
  // Proceed with API calls
} else {
  // Handle missing credentials
  throw new Error('MEXC credentials not configured');
}
```

## Security Features

### Encryption
- All secrets are encrypted using Google Cloud Platform's Key Management Service
- Secrets are encrypted at rest and in transit
- No secrets are stored in plaintext

### Environment Isolation
- Development and production secrets are completely isolated
- Different values can be set for each environment
- Local development can use override files

### Access Control
- Secrets are only accessible to your Encore application
- No direct access to secret values through CLI or dashboard
- Secrets are injected at runtime only

## Best Practices

### DO ✅
- Use descriptive secret names (e.g., `MEXC_API_KEY` not `API_KEY`)
- Set different values for development and production
- Use the provided helper functions (`getMexcCredentials()`)
- Keep secret names globally unique across your app

### DON'T ❌
- Don't commit secret values to version control
- Don't hardcode secrets in your application code
- Don't share secret values through insecure channels
- Don't use production secrets in development

## Deployment

### Encore Cloud
Secrets are automatically available when deployed to Encore Cloud:
```bash
encore deploy --env=production
```

### Docker Deployment
For Docker deployments, secrets can be injected as environment variables:
```bash
docker run -e MEXC_API_KEY="$(encore secret get MEXC_API_KEY)" mexc-mcp-server
```

## Troubleshooting

### Missing Secrets Error
If you get "secret not found" errors:

1. **Check if secret is set**:
   ```bash
   encore secret list
   ```

2. **Set the missing secret**:
   ```bash
   echo "your_value" | encore secret set --type dev,local SECRET_NAME
   ```

3. **Verify environment type**:
   - Use `--type dev,local` for development
   - Use `--type production` for production

### Local Development Issues
If secrets aren't working locally:

1. **Create local override**:
   ```bash
   # Create .secrets.local.cue with your values
   echo 'MEXC_API_KEY: "your_key"' > .secrets.local.cue
   echo 'MEXC_SECRET_KEY: "your_secret"' >> .secrets.local.cue
   ```

2. **Check fallback to environment variables**:
   ```bash
   export MEXC_API_KEY="your_key"
   export MEXC_SECRET_KEY="your_secret"
   ```

## Rotating Secrets

To rotate secrets safely:

1. **Generate new credentials in MEXC dashboard**
2. **Update secrets without downtime**:
   ```bash
   echo "new_api_key" | encore secret set --type production MEXC_API_KEY
   echo "new_secret_key" | encore secret set --type production MEXC_SECRET_KEY
   ```
3. **Deploy to apply changes**:
   ```bash
   encore deploy --env=production
   ```
4. **Revoke old credentials in MEXC dashboard**

## Support

For more information on Encore secrets management:
- [Encore Secrets Documentation](https://encore.dev/docs/ts/primitives/secrets)
- [Encore Security Best Practices](https://encore.dev/docs/security)

## Current Status

✅ **Secrets Configured:**
- `MEXC_API_KEY` - Set for dev, local, and production
- `MEXC_SECRET_KEY` - Set for dev, local, and production

✅ **Security Features:**
- Encrypted storage with GCP KMS
- Environment isolation
- Local development overrides
- Git ignore protection

✅ **Integration Complete:**
- Shared config uses Encore secrets
- Fallback to environment variables for local dev
- Helper functions for safe access
- Error handling for missing secrets