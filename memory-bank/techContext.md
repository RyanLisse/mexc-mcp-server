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

### ✅ Fully Operational
- **Runtime Environment**: Bun with TypeScript and Encore.ts services
- **Package Management**: All dependencies installed and configured
- **Code Quality**: Biome.js linting with automated pre-commit hooks
- **CI/CD Pipeline**: GitHub Actions with automated testing and deployment
- **Secret Management**: Encore.ts secrets for MEXC API keys (zero hardcoded secrets)
- **Testing Framework**: Comprehensive test suite with 100% auth coverage
- **Type Safety**: Strict TypeScript with Zod validation throughout
- **Service Architecture**: Modular structure with auth/, market-data/, shared/

### 🔄 Active Development (Task 3)
- **Authentication Middleware**: Implementing Encore.ts middleware for API validation
- **Rate Limiting**: Integrating auth middleware with rate limiting

### 📋 Planned Enhancements
- **Performance Monitoring**: Advanced metrics and observability
- **Production Deployment**: Staging and production environment setup
- **Advanced Caching**: Optimized market data caching strategies
- **Integration Testing**: Comprehensive end-to-end test coverage