# Technical Context

## Technology Stack

### Runtime & Framework
- **Runtime**: Bun (Fast JavaScript runtime with built-in bundler)
- **Framework**: Encore.ts (Backend framework for TypeScript)
- **Language**: TypeScript (Strict mode enabled)
- **Protocol**: Model Context Protocol (MCP) for AI agent integration

### Development Tools
- **Package Manager**: Bun (with bunfig.toml configuration)
- **Linting**: Biome (biome.json configuration)
- **Type Checking**: TypeScript compiler with strict settings
- **Testing**: Bun's built-in test runner
- **Git Hooks**: lint-staged for pre-commit validation

### External APIs & Services
- **MEXC Global API**: Cryptocurrency exchange API
  - REST API for market data and account operations
  - WebSocket API for real-time data streams
  - Rate limiting: Respect MEXC API limits
  - Authentication: API key and secret required

### Dependencies (from package.json analysis)
- Encore.ts framework and related packages
- TypeScript development dependencies
- Testing and linting tools
- MCP protocol implementation libraries

## Architecture Constraints

### File Size Limits
- **Strict Limit**: < 500 lines per file
- **Recommended**: < 300 lines for better maintainability
- **Enforcement**: Manual review and automated checks via linting

### Module Boundaries
- **Clear Separation**: auth/, market-data/, shared/ modules
- **No Cross-Dependencies**: Avoid circular dependencies between modules
- **Interface Contracts**: Well-defined TypeScript interfaces between modules

### Performance Requirements
- **Low Latency**: Sub-second response times for market data
- **High Availability**: Graceful handling of MEXC API outages
- **Memory Efficiency**: Efficient handling of large datasets
- **Connection Management**: Proper WebSocket lifecycle management

## Secret Management Strategy

### Environment Variables (MANDATORY - NO HARDCODING)
```bash
# MEXC API Configuration
MEXC_API_KEY=your_api_key_here
MEXC_SECRET_KEY=your_secret_key_here
MEXC_BASE_URL=https://api.mexc.com

# Server Configuration
MCP_SERVER_PORT=3000
LOG_LEVEL=info

# Optional: Rate Limiting
MEXC_RATE_LIMIT_PER_MINUTE=1200
CACHE_TTL_SECONDS=30
```

### Security Best Practices
- **No Hardcoded Secrets**: All credentials via environment variables
- **API Key Rotation**: Support for key rotation without restart
- **Least Privilege**: Minimal required MEXC API permissions
- **Input Validation**: Strict validation of all external inputs
- **Error Sanitization**: No sensitive data in error messages

## Development Environment

### Local Setup Requirements
1. **Bun Runtime**: Latest stable version
2. **Environment File**: `.env` with required MEXC credentials
3. **MEXC Account**: API key with appropriate permissions
4. **Network Access**: Outbound HTTPS to api.mexc.com

### Testing Strategy
- **Unit Tests**: Individual function testing with mocks
- **Integration Tests**: Real MEXC API testing (rate limited)
- **MCP Tests**: End-to-end protocol compliance testing
- **Performance Tests**: Latency and throughput validation

### Configuration Files

#### `bunfig.toml`
- Bun runtime configuration
- Package resolution settings
- Development server options

#### `biome.json`
- Code formatting and linting rules
- TypeScript-specific configurations
- Import sorting and organization

#### `tsconfig.json`
- Strict TypeScript compilation
- Module resolution configuration
- Build output settings

## Deployment Considerations

### Production Environment
- **Container Support**: Docker containerization support
- **Environment Variables**: Secure secret injection
- **Health Checks**: Endpoint for service monitoring
- **Logging**: Structured logging for observability

### Scaling Constraints
- **MEXC Rate Limits**: API calls per minute restrictions
- **Memory Usage**: Efficient data structure usage
- **Connection Limits**: WebSocket connection pooling
- **Caching Strategy**: Time-based cache for repeated requests

## Known Limitations & Workarounds

### MEXC API Limitations
- **Rate Limiting**: 1200 requests per minute default
- **Data Latency**: ~100-500ms for real-time data
- **Historical Data**: Limited lookback periods for some endpoints
- **Symbol Naming**: Inconsistent symbol naming conventions

### Framework Constraints
- **Encore.ts**: Specific deployment patterns required
- **Bun Runtime**: Limited ecosystem compared to Node.js
- **MCP Protocol**: Evolving specification, may require updates

## Integration Points

### MCP Server Interface
- **Tool Registration**: Dynamic tool discovery and registration
- **Request/Response**: JSON-RPC 2.0 protocol compliance
- **Error Handling**: Standardized error codes and messages
- **Type Safety**: Full TypeScript typing for all interfaces

### MEXC API Interface
- **REST Client**: HTTP client with retry and timeout logic
- **WebSocket Client**: Real-time data streaming support
- **Authentication**: HMAC-SHA256 signature generation
- **Data Transformation**: MEXC format to MCP tool format conversion

## Monitoring & Observability

### Logging Strategy
- **Structured Logs**: JSON format for machine parsing
- **Log Levels**: DEBUG, INFO, WARN, ERROR categorization
- **Request Tracing**: Unique request IDs for correlation
- **Performance Metrics**: Response time and error rate tracking

### Health Monitoring
- **Health Endpoint**: `/health` for service status
- **MEXC Connectivity**: API connection status monitoring
- **Memory Usage**: Runtime memory consumption tracking
- **Error Rates**: API error frequency monitoring

## Current Implementation Status

### ✅ Production Ready Implementation
- **Runtime Environment**: Bun with TypeScript and complete Encore.ts service architecture
- **Service Architecture**: 5 independent services (auth, market-data, trading, portfolio, tools)
- **MCP Protocol**: 13 fully implemented tools for cryptocurrency operations
- **API Integration**: Complete MEXC API client with caching and error handling
- **Authentication**: Encore.ts auth handler with API key validation and rate limiting
- **Type Safety**: Full TypeScript interfaces replacing Zod validation
- **Testing**: Comprehensive test suites for all services
- **Documentation**: Complete API documentation and deployment guides
- **Secret Management**: Encore.ts secrets management (zero hardcoded secrets)
- **Code Quality**: Biome.js linting with automated pre-commit hooks
- **CI/CD Pipeline**: GitHub Actions with automated testing and deployment

### ✅ Completed Migration
- **Zod to TypeScript**: Complete migration from Zod schemas to TypeScript interfaces
- **Service Boundaries**: Proper Encore.ts service structure with clean APIs
- **Error Handling**: Standardized error responses across all services
- **Caching Strategy**: Intelligent caching for market data with configurable TTL
- **Health Monitoring**: Health check endpoints for all services

### 🚀 Production Deployment Ready
- **Service Discovery**: All services properly registered with Encore.ts
- **Secrets Management**: Environment-specific secret configuration
- **Performance**: Optimized response times with caching
- **Monitoring**: Health checks and error tracking
- **Documentation**: Complete setup and deployment instructions