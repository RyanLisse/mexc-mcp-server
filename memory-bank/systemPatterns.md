# System Patterns & Architecture

## Core Architectural Principles

### Modular Design (Primary Pattern)
- **Module Separation**: Clear boundaries between auth/, market-data/, shared/ modules
- **Single Responsibility**: Each module handles one primary domain concern
- **File Size Limits**: Strict enforcement of <500 lines per file
- **Interface-Based Design**: Well-defined interfaces between modules

### MCP Server Architecture
- **Tool-Based Exposure**: MEXC functionality exposed as MCP tools
- **Stateless Design**: Each MCP tool call is independent and stateless
- **Error Handling**: Consistent error responses across all tools
- **Type Safety**: Full TypeScript typing for all MCP tool definitions

### Security Patterns
- **Environment Variable Configuration**: All secrets via environment variables
- **API Key Management**: Secure handling of MEXC API credentials
- **Validation**: Input validation for all tool parameters
- **Least Privilege**: Minimal required permissions for operations

## Module Organization

### `/auth` Module
**Purpose**: Authentication and authorization management  
**Responsibilities**:
- MEXC API key validation
- Authentication state management
- Security utilities
- **Files**: Keep auth logic under 500 lines per file

### `/market-data` Module  
**Purpose**: Market data retrieval and processing  
**Responsibilities**:
- Real-time price data
- Historical data fetching
- Data format standardization
- Rate limiting and caching
- **Files**: Separate concerns (fetching, processing, caching)

### `/shared` Module
**Purpose**: Common utilities and types  
**Responsibilities**:
- TypeScript type definitions (`/types`)
- Common utilities (`/utils`)
- Shared constants and configurations
- **Files**: Logical grouping, maintain file size limits

## Design Patterns

### Factory Pattern
- **MCP Tool Factory**: Centralized tool registration and configuration
- **Client Factory**: MEXC API client instantiation with configuration

### Repository Pattern
- **Data Access Layer**: Abstraction over MEXC API calls
- **Caching Layer**: Optional caching implementation for market data

### Observer Pattern
- **Real-time Updates**: WebSocket connections for live market data
- **Event Handling**: Structured event emission for market changes

## Code Organization Standards

### File Structure
```
module/
├── index.ts          # Module exports (< 100 lines)
├── types.ts          # Type definitions (< 300 lines)
├── client.ts         # API client logic (< 400 lines)
├── handlers/         # Individual tool handlers (< 200 lines each)
└── utils.ts          # Module utilities (< 300 lines)
```

### Naming Conventions
- **Files**: kebab-case (`market-data-client.ts`)
- **Functions**: camelCase (`fetchMarketData`)
- **Types**: PascalCase (`MarketDataResponse`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`)

### Import/Export Patterns
- **Barrel Exports**: Use index.ts for clean module interfaces
- **Named Exports**: Prefer named exports over default exports
- **Type-only Imports**: Use `import type` for type-only dependencies

## Error Handling Patterns

### Consistent Error Structure
```typescript
interface MCPError {
  code: string;
  message: string;
  details?: unknown;
}
```

### Error Categories
- **Authentication Errors**: Invalid API keys, permission issues
- **Validation Errors**: Invalid parameters, missing required fields
- **Network Errors**: MEXC API timeouts, connection failures
- **Rate Limiting**: API quota exceeded, backoff strategies

## Testing Patterns

### Test Organization
- **Unit Tests**: Individual function/method testing
- **Integration Tests**: Module-to-module interaction testing
- **MCP Tool Tests**: End-to-end tool functionality testing
- **Mock Strategies**: MEXC API mocking for reliable testing

### Test File Naming
- `*.test.ts` for unit tests
- `*.integration.test.ts` for integration tests
- `*.e2e.test.ts` for end-to-end tests

## Performance Considerations

### Caching Strategy
- **Market Data**: Time-based cache for frequent requests
- **Authentication**: Session-based auth token caching
- **Rate Limiting**: Request throttling to respect MEXC limits

### Memory Management
- **Connection Pooling**: Efficient HTTP client reuse
- **Data Streaming**: Stream processing for large datasets
- **Garbage Collection**: Proper cleanup of WebSocket connections

## Extensibility Patterns

### Plugin Architecture
- **Tool Registration**: Dynamic MCP tool registration
- **Middleware Support**: Request/response processing pipeline
- **Configuration**: Environment-based feature flags

### Future Considerations
- Additional exchange support
- Advanced trading features
- Real-time analytics capabilities
- Multi-user authentication support

## Implementation Status

### ✅ Completed Patterns
- **Encore.ts Service Architecture**: Fully implemented with modular structure
- **Security Patterns**: Encore.ts secrets management, zero hardcoded credentials
- **Modularity**: Clean separation with auth/, market-data/, shared/ services
- **Type Safety**: Strict TypeScript with Zod validation throughout
- **Quality Assurance**: CI/CD pipeline with automated quality gates
- **Testing**: 100% coverage for auth module, comprehensive test patterns
- **Error Handling**: Structured error responses with proper HTTP status codes

### 🔄 In Progress
- **Authentication Middleware**: Implementing Encore.ts middleware for API key validation (Task 3)
- **Rate Limiting Integration**: Connecting auth middleware with rate limiting

### 📋 Pending Implementation
- **Advanced Caching**: Optimized market data caching strategies
- **Performance Monitoring**: Request/response timing and metrics
- **Integration Tests**: Comprehensive end-to-end testing
- **Production Deployment**: Staging and production environment setup