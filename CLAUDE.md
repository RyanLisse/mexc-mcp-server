# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `bun test` - Run full test suite (49 tests)
- `bun run test:mexc` - Test real MEXC API integration
- `bun run test:coverage` - Run tests with coverage report
- `bun run dev` - Start Encore development server
- `bun run build` - Build the application
- `bun run check` - Run linting and type checking

### Code Quality
- `bun run lint` - Check code with Biome.js linter
- `bun run lint:fix` - Fix linting issues automatically
- `bun run format` - Format code with Biome.js
- `bun run type-check` - TypeScript type checking without emit

## Architecture Overview

This is a **MEXC cryptocurrency exchange MCP (Model Context Protocol) server** built with **vertical slice architecture**:

### Technology Stack
- **Runtime**: Bun (3x faster than Node.js)
- **Framework**: Encore.ts microservices framework
- **Language**: TypeScript with strict type checking
- **Validation**: Encore.ts built-in validation with TypeScript
- **Linting**: Biome.js (35x faster than ESLint)
- **Testing**: Bun's built-in test runner

### Service Architecture
The project follows Encore.ts microservice patterns with separate services:
- **Root Service** (`encore.service.ts`): Main MCP server
- **Auth Service** (`auth/`): API key validation and authentication
- **Market Data Service** (`market-data/`): Live MEXC API integration

### Vertical Slices (Complete Features)
1. **Authentication & API Key Management** ✅ (21 tests, 100% coverage)
2. **Market Data MCP Tools** ✅ (28 tests, 96.30% coverage, live API)

### Key Files
- `shared/config.ts` - Environment configuration with validation
- `shared/types/index.ts` - Common TypeScript interfaces
- `market-data/mexc-client.ts` - Real MEXC API client with HMAC auth
- `market-data/tools.ts` - MCP tool implementations
- `auth/auth.ts` - API key validation and rate limiting

## Code Patterns

### Error Handling
All functions return structured responses with `success`, `data`, and `error` fields:
```typescript
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
```

### Environment Configuration
Use `shared/config.ts` for all environment variables with validation. The config includes MEXC credentials, server settings, rate limits, and cache TTLs.

### Type Validation
All API inputs/outputs use TypeScript interfaces with Encore.ts validation. Type definitions are in service-specific `types.ts` files.

### Testing
- Real API integration tests with live MEXC data
- Comprehensive mocking for unit tests
- Coverage reporting enabled
- Tests are co-located with implementation files

### Encore.ts Patterns
- Each service has its own `encore.service.ts` file
- API endpoints defined in `api.ts` files
- Services communicate via Encore's built-in RPC

## Production Considerations

### Security
- MEXC API keys validated with regex patterns
- HMAC-SHA256 signature generation for authenticated requests
- Rate limiting (100 req/min configurable)
- Input sanitization via TypeScript type validation

### Performance
- Intelligent caching with configurable TTLs
- Concurrent API request handling
- Response times: 250-350ms for MEXC API calls

### Quality Gates
- All tests must pass before commits
- Biome.js formatting and linting enforced
- TypeScript strict mode enabled
- Pre-commit hooks via Husky + lint-staged

## Development Workflow

1. **Feature Development**: Follow vertical slice architecture
2. **Testing**: Run `bun run test:mexc` to validate live API integration
3. **Code Quality**: Use `bun run check` before commits
4. **API Testing**: Real MEXC credentials required for full test suite