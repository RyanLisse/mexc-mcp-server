# Docker Deployment Guide - MEXC MCP Server

This guide provides multiple Docker deployment options for the MEXC MCP Server.

## Prerequisites

- Docker and Docker Compose installed
- MEXC API credentials (API Key and Secret Key)
- Encore CLI (for Encore-native builds)

## Deployment Options

### Option 1: Docker Compose (Recommended)

This is the simplest deployment method using Docker Compose.

#### 1. Set Environment Variables

Create a `.env` file in the project root:

```bash
# Required MEXC API credentials
MEXC_API_KEY=your_actual_mexc_api_key
MEXC_SECRET_KEY=your_actual_mexc_secret_key

# Optional: API endpoints (defaults shown)
MEXC_BASE_URL=https://api.mexc.com
MEXC_WEBSOCKET_URL=wss://wbs.mexc.com/ws

# Optional: Application settings
NODE_ENV=production
LOG_LEVEL=info
PORT=3000

# Optional: Rate limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Optional: Cache settings (milliseconds)
CACHE_TTL_TICKER=5000
CACHE_TTL_ORDERBOOK=2000
CACHE_TTL_STATS=10000

# Optional: AI integration
GOOGLE_API_KEY=your_google_api_key
```

#### 2. Deploy with Docker Compose

```bash
# Build and start the service
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f mexc-mcp-server

# Stop the service
docker-compose down
```

#### 3. Test the Deployment

```bash
# Health check
curl http://localhost:3000/health

# Test an MCP endpoint (if API keys are valid)
curl http://localhost:3000/market-data/ticker/BTCUSDT
```

### Option 2: Manual Docker Build

If you prefer to build and run manually:

```bash
# Build the image
docker build -t mexc-mcp-server:local .

# Run the container
docker run -d \
  --name mexc-mcp-server \
  -p 3000:3000 \
  -e MEXC_API_KEY=your_api_key \
  -e MEXC_SECRET_KEY=your_secret_key \
  -e NODE_ENV=production \
  mexc-mcp-server:local

# Check logs
docker logs mexc-mcp-server

# Stop container
docker stop mexc-mcp-server
docker rm mexc-mcp-server
```

### Option 3: Encore Native Deployment

For production deployments using Encore cloud:

```bash
# Set secrets in Encore
encore secrets set --env=production MEXC_API_KEY
encore secrets set --env=production MEXC_SECRET_KEY

# Deploy to Encore cloud
encore deploy --env=production

# Or build Docker image with Encore
encore build docker mexc-mcp-server:production
```

## Deployment Script

Use the included deployment script for automated setup:

```bash
# Make script executable
chmod +x deploy.sh

# Run deployment (attempts Encore build first, falls back to Docker)
./deploy.sh

# Push to registry
./deploy.sh --push
```

## Troubleshooting

### Common Issues

1. **Container stops immediately**
   - Check that MEXC_API_KEY and MEXC_SECRET_KEY are set
   - Verify the credentials are valid
   - Check container logs: `docker logs <container_name>`

2. **Encore runtime errors**
   - Use the standard Dockerfile instead of Encore's Docker build
   - Ensure all services are copied in the Docker image

3. **API connection failures**
   - Verify MEXC API credentials are correct
   - Check network connectivity to api.mexc.com
   - Review rate limiting settings

4. **Health check failures**
   - The health endpoint requires valid API credentials
   - Check that port 3000 is accessible
   - Verify the application started successfully

### Debug Mode

Run in debug mode to see detailed logs:

```bash
# Docker Compose with debug logging
LOG_LEVEL=debug docker-compose up

# Direct Docker run with debug
docker run --rm \
  -e MEXC_API_KEY=your_key \
  -e MEXC_SECRET_KEY=your_secret \
  -e LOG_LEVEL=debug \
  -p 3000:3000 \
  mexc-mcp-server:latest
```

### Logs Location

Logs are available through Docker:

```bash
# View recent logs
docker-compose logs mexc-mcp-server

# Follow logs in real-time
docker-compose logs -f mexc-mcp-server

# View logs from specific time
docker-compose logs --since="2024-01-01T00:00:00" mexc-mcp-server
```

## Security Considerations

1. **Environment Variables**: Store sensitive values in `.env` file, never commit to git
2. **Network Security**: Use Docker networks to isolate the application
3. **User Permissions**: Container runs as non-root user `encore` (UID 1001)
4. **Health Checks**: Built-in health monitoring with automatic restarts

## Performance Tuning

1. **Memory**: Default container needs ~512MB RAM
2. **CPU**: Single core sufficient for moderate load
3. **Caching**: Tune TTL values based on your use case
4. **Rate Limits**: Adjust based on your MEXC API limits

## Production Deployment

For production environments:

1. Use proper secrets management (Docker secrets, Kubernetes secrets, etc.)
2. Set up monitoring and alerting
3. Configure log aggregation
4. Use load balancers for high availability
5. Implement proper backup strategies
6. Set up SSL/TLS termination

## Support

- Check the main README.md for API documentation
- Review logs for error details
- Ensure MEXC API credentials have proper permissions
- Test with the included test suite: `bun test`