# MEXC MCP Server Deployment Guide

## Prerequisites

1. **MEXC API Credentials**: Obtain API key and secret from MEXC exchange
2. **Docker**: For containerized deployment
3. **Encore CLI**: For Encore Cloud deployment

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `MEXC_API_KEY`: Your MEXC API key (format: mx0v...)
- `MEXC_SECRET_KEY`: Your MEXC secret key (32+ character hex string)

## Local Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Start MCP server
encore mcp run --app mexc-mcp-server
```

## Docker Deployment

1. **Build Docker image**:
```bash
encore build docker mexc-mcp-server:latest
```

2. **Run with Docker Compose**:
```bash
docker-compose up -d
```

3. **Check container status**:
```bash
docker-compose ps
docker-compose logs mexc-mcp-server
```

## Encore Cloud Deployment

1. **Authenticate with Encore**:
```bash
encore auth login
```

2. **Create/Link app**:
```bash
encore app create mexc-mcp-server
encore app link mexc-mcp-server
```

3. **Set secrets** (replace with your actual values):
```bash
encore secrets set --env=production MEXC_API_KEY=mx0v_your_actual_api_key
encore secrets set --env=production MEXC_SECRET_KEY=your_actual_secret_key
```

4. **Deploy**:
```bash
encore build docker mexc-mcp-server:production --push
```

## Health Check

The server includes a health check endpoint at `/health` that verifies:
- API connectivity
- Credential validation
- Service availability

## Security Notes

- Never commit actual API keys to version control
- Use environment variables for all sensitive configuration
- Rotate API keys regularly
- Monitor API usage and rate limits

## Troubleshooting

- Check container logs: `docker-compose logs mexc-mcp-server`
- Verify environment variables are set correctly
- Ensure MEXC API credentials are valid and have proper permissions
- Check network connectivity to MEXC API endpoints