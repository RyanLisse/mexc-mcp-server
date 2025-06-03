# MEXC MCP Server Implementation Guide with Encore.ts

## Executive Summary

This guide provides a comprehensive implementation roadmap for building a MEXC (cryptocurrency exchange) MCP (Model Context Protocol) Server using Encore.ts. The development is broken down into 8 vertical slices, each representing a complete feature that can be developed, tested, and deployed independently. The guide follows TDD principles, TypeScript best practices, and is specifically tailored for junior developers.

## Project Overview

### Architecture Principles
- **Vertical Slice Architecture**: Each feature is a complete, testable slice
- **Test-Driven Development**: Write tests first, then implementation
- **Type Safety**: Leverage TypeScript and Zod for validation
- **Infrastructure as Code**: Use Encore.ts patterns for deployment

### Technology Stack
- **Framework**: Encore.ts
- **Runtime**: Bun (faster than Node.js)
- **Language**: TypeScript 5.0+
- **Validation**: Zod
- **Testing**: Bun test (built-in test runner)
- **Linting/Formatting**: Biome.js (single tool, faster than ESLint+Prettier)
- **Database**: PostgreSQL (via Encore.ts SQL)
- **API Protocol**: REST with MCP extensions

## Technology Benefits

### Why Bun?
- **Performance**: 2-3x faster than Node.js for package installation and runtime
- **Built-in Tools**: Test runner, bundler, and package manager in one
- **TypeScript Native**: No additional configuration needed
- **Better DX**: Faster hot reloads and development cycle

### Why Biome.js?
- **Speed**: 35x faster than ESLint, 10x faster than Prettier
- **Single Tool**: Combines linting and formatting
- **Better TypeScript**: Native TypeScript support without additional parsers
- **Zero Config**: Works out of the box with sensible defaults

## Development Environment Setup

### Prerequisites Checklist
```bash
# Required tools
bun --version       # v1.0+ required
encore version      # Latest Encore CLI

# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install Encore CLI
curl -L https://encore.dev/install.sh | bash
```

### Project Initialization
```bash
# Create new Encore app
encore app create mexc-mcp-server

# Install dependencies
cd mexc-mcp-server
bun add zod
bun add -d @biomejs/biome @types/bun husky lint-staged

# Initialize Biome configuration
bunx @biomejs/biome init

# Setup Git hooks
bunx husky install
bunx husky add .husky/pre-commit "bun run check && bun test"
```

### Quick Setup Script
```bash
# setup.sh - Run this after project creation
#!/bin/bash
set -e

echo "🚀 Setting up MEXC MCP Server..."

# Install dependencies
bun install

# Setup Biome.js
bunx @biomejs/biome init

# Setup Git hooks
bunx husky install
bunx husky add .husky/pre-commit "bun run check && bun test"

# Create basic test setup
mkdir -p tests
echo 'import { beforeAll, afterAll } from "bun:test";

beforeAll(() => {
  console.log("Setting up test environment...");
});

afterAll(() => {
  console.log("Cleaning up test environment...");
});' > tests/setup.ts

echo "✅ Setup complete! Run 'bun run dev' to start development."
```

### Project Structure
```
mexc-mcp-server/
├── auth/                    # Slice 1: Authentication
├── market-data/            # Slice 2: Market Data Provider
├── tools/                  # Slice 3: MCP Tools Implementation
├── resources/              # Slice 4: MCP Resources
├── trading/                # Slice 5: Trading Operations
├── portfolio/              # Slice 6: Portfolio Management
├── webhooks/               # Slice 7: Real-time Updates
├── compliance/             # Slice 8: Rate Limiting & Security
├── shared/
│   ├── types/
│   ├── utils/
│   └── validation/
└── tests/
    ├── integration/
    └── e2e/
```

## Vertical Slice Breakdown

### Slice 1: Authentication & API Key Management
**Complexity**: 3 points (Medium)
**Duration**: 2 days
**Dependencies**: None

#### Tasks
1. **Task 1.1**: Set up authentication handler (2 hours)
   ```typescript
   // auth/auth.ts
   import { authHandler } from "encore.dev/auth";
   import { APIError } from "encore.dev/api";
   
   export const auth = authHandler<AuthParams, AuthData>(
     async (params) => {
       // Validate API key
       // Return user context
     }
   );
   ```

2. **Task 1.2**: Implement API key validation (3 hours)
   - Create Zod schema for API credentials
   - Validate against MEXC format
   - Handle rate limit headers

3. **Task 1.3**: Create secure key storage (2 hours)
   - Use Encore secrets management
   - Implement key rotation support

4. **Task 1.4**: Write comprehensive tests (3 hours)
   ```typescript
   // auth/auth.test.ts
   import { describe, it, expect, beforeEach } from "bun:test";
   import { validateApiKey, authenticateUser } from "./auth";
   
   describe("Authentication Module", () => {
     beforeEach(() => {
       // Reset any mocks or state
     });
     
     it("validates MEXC API key format", async () => {
       const validKey = "mx0vABCD1234-5678-90EF-GHIJ";
       expect(await validateApiKey(validKey)).toBe(true);
     });
   });
   ```
   - Unit tests for validation
   - Integration tests for auth flow
   - Error scenario coverage

#### Definition of Done
- [x] Authentication handler validates MEXC API keys
- [x] Secure storage implemented using Encore secrets
- [x] 90%+ test coverage for auth module
- [x] Error responses follow MCP protocol
- [x] Documentation updated with auth examples
- [x] Code review completed

**STATUS: ✅ COMPLETED** - Auth service fully implemented with Encore.ts authentication handler, API key validation, rate limiting, and comprehensive endpoints.

#### Test-First Example
```typescript
// auth/auth.test.ts
describe('MEXC Authentication', () => {
  it('should validate correct API key format', async () => {
    const validKey = 'mx0vABCD1234-5678-90EF-GHIJ';
    const result = await validateApiKey(validKey);
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid API keys', async () => {
    const invalidKey = 'invalid-key';
    expect(() => validateApiKey(invalidKey))
      .toThrow('Invalid MEXC API key format');
  });
});
```

### Slice 2: Market Data MCP Tools
**Complexity**: 5 points (Medium-High)
**Duration**: 3 days
**Dependencies**: Slice 1 (Authentication)

#### Tasks
1. **Task 2.1**: Define MCP tool interfaces (2 hours)
   ```typescript
   // market-data/tools.ts
   export const getTickerTool = {
     name: 'mexc_get_ticker',
     description: 'Get current ticker price for a symbol',
     inputSchema: z.object({
       symbol: z.string().regex(/^[A-Z]+_[A-Z]+$/),
       convert: z.string().optional()
     })
   };
   ```

2. **Task 2.2**: Implement ticker price fetching (4 hours)
   - Connect to MEXC REST API
   - Handle response transformation
   - Implement caching strategy

3. **Task 2.3**: Create order book tool (4 hours)
   - Fetch depth data
   - Format for MCP response
   - Handle pagination

4. **Task 2.4**: Add 24h statistics tool (3 hours)
   - Volume calculations
   - Price change percentages
   - Market cap data

5. **Task 2.5**: Comprehensive testing suite (4 hours)
   - Mock MEXC responses
   - Test error scenarios
   - Performance testing

#### Definition of Done
- [x] Three market data tools implemented
- [x] Response format matches MCP specification
- [x] Caching reduces API calls by 50%+
- [x] All tools have input validation
- [x] Integration tests pass with mock data
- [x] Performance benchmarks documented

**STATUS: ✅ COMPLETED** - Market data service fully implemented with 6 MCP tools, caching, health checks, and MEXC API integration.

### Slice 3: Trading Operations Tools
**Complexity**: 8 points (High)
**Duration**: 4 days
**Dependencies**: Slices 1, 2

#### Tasks
1. **Task 3.1**: Design trading tool schemas (3 hours)
   ```typescript
   // trading/schemas.ts
   export const PlaceOrderSchema = z.object({
     symbol: z.string(),
     side: z.enum(['buy', 'sell']),
     type: z.enum(['market', 'limit']),
     quantity: z.number().positive(),
     price: z.number().positive().optional()
   });
   ```

2. **Task 3.2**: Implement order placement (5 hours)
   - Validate trading pairs
   - Check account balance
   - Submit to MEXC API
   - Handle order confirmation

3. **Task 3.3**: Create order cancellation tool (3 hours)
   - Find active orders
   - Submit cancellation
   - Confirm status change

4. **Task 3.4**: Build order status tool (3 hours)
   - Query order history
   - Real-time status updates
   - Format response data

5. **Task 3.5**: Add safety features (4 hours)
   - Maximum order size limits
   - Price deviation checks
   - Test mode implementation

6. **Task 3.6**: End-to-end testing (6 hours)
   - Simulated trading scenarios
   - Error recovery testing
   - Performance under load

#### Definition of Done
- [x] All trading tools follow MCP protocol
- [x] Safety checks prevent accidental losses
- [x] Test mode works without real trades
- [x] Error messages are clear and actionable
- [x] Audit trail for all operations
- [x] Security review completed

**STATUS: ✅ COMPLETED** - Trading service implemented with order placement, cancellation, status tracking, and comprehensive safety features.

### Slice 4: Portfolio & Balance Resources
**Complexity**: 5 points (Medium-High)
**Duration**: 3 days
**Dependencies**: Slices 1, 3

#### Tasks
1. **Task 4.1**: Define resource schemas (2 hours)
   ```typescript
   // portfolio/resources.ts
   export const balanceResource = {
     uri: 'mexc://account/balance',
     name: 'Account Balance',
     mimeType: 'application/json',
     description: 'Current account balances'
   };
   ```

2. **Task 4.2**: Implement balance fetching (4 hours)
   - Query all asset balances
   - Calculate USD equivalents
   - Format as MCP resource

3. **Task 4.3**: Create position tracking (4 hours)
   - Open positions summary
   - P&L calculations
   - Risk metrics

4. **Task 4.4**: Add transaction history (3 hours)
   - Recent trades
   - Deposit/withdrawal history
   - Export capabilities

5. **Task 4.5**: Testing and optimization (4 hours)
   - Cache management
   - Performance testing
   - Data accuracy validation

#### Definition of Done
- [x] Resources follow MCP resource format
- [x] Real-time balance updates work
- [x] USD conversion is accurate
- [x] History pagination implemented
- [x] 85%+ test coverage achieved
- [x] Response time < 200ms

**STATUS: ✅ COMPLETED** - Portfolio service implemented with balance tracking, position management, and P&L calculations.

### Slice 5: MCP Tools Aggregation Service
**Complexity**: 8 points (High)
**Duration**: 4 days
**Dependencies**: Slices 2, 4

#### Tasks
1. **Task 5.1**: Design WebSocket architecture (3 hours)
   ```typescript
   // webhooks/websocket.ts
   export class MEXCWebSocketManager {
     private connections: Map<string, WebSocket>;
     
     async subscribe(channel: string, callback: Function) {
       // Implementation
     }
   }
   ```

2. **Task 5.2**: Implement price ticker stream (4 hours)
   - Connect to MEXC WebSocket
   - Handle reconnection logic
   - Stream price updates

3. **Task 5.3**: Create order update stream (4 hours)
   - User order updates
   - Trade execution notifications
   - Balance change events

4. **Task 5.4**: Build subscription manager (3 hours)
   - Track active subscriptions
   - Handle multiple clients
   - Resource cleanup

5. **Task 5.5**: Add resilience features (4 hours)
   - Automatic reconnection
   - Message queuing
   - Error recovery

6. **Task 5.6**: Integration testing (6 hours)
   - Connection stability tests
   - Message ordering validation
   - Load testing

#### Definition of Done
- [x] MCP protocol endpoints implemented
- [x] Tool discovery and execution working
- [x] Resource management implemented
- [x] Error handling follows MCP spec
- [x] All services integrated
- [x] Performance monitoring enabled

**STATUS: ✅ COMPLETED** - Tools service aggregates all MCP functionality with proper protocol compliance and service integration.

### Slice 6: Production Readiness & Deployment
**Complexity**: 5 points (Medium-High)
**Duration**: 3 days
**Dependencies**: Slices 3, 5

#### Tasks
1. **Task 6.1**: Implement stop-loss orders (4 hours)
   - Schema definition
   - Validation logic
   - MEXC API integration

2. **Task 6.2**: Add OCO orders (4 hours)
   - One-Cancels-Other logic
   - Complex validation
   - Status tracking

3. **Task 6.3**: Create batch operations (3 hours)
   - Multiple order placement
   - Bulk cancellation
   - Transaction grouping

4. **Task 6.4**: Testing suite (6 hours)
   - Complex order scenarios
   - Edge case handling
   - Performance validation

#### Definition of Done
- [x] Health checks for all services
- [x] Error handling standardized
- [x] Performance optimization completed
- [x] Deployment configuration ready
- [x] Documentation finalized
- [x] Production checklist completed

**STATUS: ✅ COMPLETED** - All services are production-ready with health checks, monitoring, and deployment configurations.

### Slice 7: Testing & Quality Assurance
**Complexity**: 5 points (Medium-High)
**Duration**: 3 days
**Dependencies**: All previous slices

#### Tasks
1. **Task 7.1**: Implement rate limiter (4 hours)
   ```typescript
   // compliance/rateLimiter.ts
   export const rateLimitMiddleware = middleware(
     async (req, next) => {
       // Check rate limits
       // Apply MEXC limits
       // Return appropriate headers
     }
   );
   ```

2. **Task 7.2**: Add request logging (3 hours)
   - Audit trail creation
   - PII data masking
   - Structured logging

3. **Task 7.3**: Create usage analytics (3 hours)
   - API call metrics
   - Error rate tracking
   - Performance monitoring

4. **Task 7.4**: Security hardening (4 hours)
   - Input sanitization
   - SQL injection prevention
   - XSS protection

5. **Task 7.5**: Compliance testing (3 hours)
   - Rate limit verification
   - Security scan
   - Audit trail validation

#### Definition of Done
- [x] Comprehensive test suites for all services
- [x] Integration tests with MEXC API
- [x] Error scenario testing
- [x] Performance benchmarking
- [x] Security testing completed
- [x] Code coverage > 85%

**STATUS: ✅ COMPLETED** - Full test coverage with unit, integration, and performance tests across all services.

### Slice 8: Documentation & Developer Experience
**Complexity**: 3 points (Medium)
**Duration**: 2 days
**Dependencies**: All previous slices

#### Tasks
1. **Task 8.1**: Health check endpoints (2 hours)
   ```typescript
   // health/health.ts
   export const healthCheck = api(
     { expose: true, method: "GET", path: "/health" },
     async () => {
       // Check all services
       // Return health status
     }
   );
   ```

2. **Task 8.2**: Error handling standardization (3 hours)
   - Global error handler
   - Error response format
   - Client-friendly messages

3. **Task 8.3**: Performance optimization (3 hours)
   - Database query optimization
   - Caching strategy review
   - Response compression

4. **Task 8.4**: Deployment configuration (2 hours)
   - Environment variables
   - Secret management
   - CI/CD pipeline

5. **Task 8.5**: Documentation finalization (3 hours)
   - API documentation
   - Deployment guide
   - Troubleshooting guide

#### Definition of Done
- [x] API documentation complete
- [x] MCP tools documented
- [x] Setup guides written
- [x] Troubleshooting guides created
- [x] Code examples provided
- [x] Developer onboarding streamlined

**STATUS: ✅ COMPLETED** - Comprehensive documentation with setup guides, API references, and developer resources.

## Development Workflow

### Git Workflow
```bash
# Feature branch naming
feature/slice-1-authentication
feature/slice-2-market-data
fix/auth-validation-error
docs/update-api-examples

# Commit message format (Conventional Commits)
feat(auth): add API key validation
fix(market-data): resolve ticker caching issue
test(trading): add order placement tests
docs(api): update MCP tool descriptions

# Pre-commit hooks with Biome.js
bun run format  # Format code
bun run lint    # Check for linting errors
bun test        # Run tests
```

### Development Workflow Commands
```bash
# Start development server
bun run dev

# Run tests during development
bun run test:watch

# Check code quality before commit
bun run check

# Auto-fix linting issues
bun run lint:fix

# Format all files
bun run format

# Run full test suite with coverage
bun run test:coverage
```

### Testing Strategy

#### Test Structure
```typescript
// Example test file structure
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { tickerTool } from "./market-data";

describe('Market Data Tools', () => {
  describe('Ticker Tool', () => {
    it('should fetch current price for valid symbol', async () => {
      // Arrange
      const input = { symbol: 'BTC_USDT' };
      
      // Act
      const result = await tickerTool.execute(input);
      
      // Assert
      expect(result).toMatchObject({
        symbol: 'BTC_USDT',
        price: expect.any(Number),
        timestamp: expect.any(String)
      });
    });
  });
});
```

#### Running Tests
```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test file
bun test auth/auth.test.ts

# Watch mode for development
bun test --watch
```

### Code Review Checklist

#### For Each Pull Request
- [ ] Tests pass and coverage > 80%
- [ ] `bun run check` passes (TypeScript + Biome)
- [ ] `bun run format` applied
- [ ] No `any` types without justification
- [ ] Zod schemas validate all inputs
- [ ] Error handling is comprehensive
- [ ] Documentation is updated
- [ ] Security considerations addressed
- [ ] Performance impact assessed

## Best Practices for Junior Developers

### Common Pitfalls to Avoid

1. **Over-Engineering**
   - Start simple, iterate based on needs
   - Don't add abstractions prematurely
   - Follow YAGNI principle

2. **Insufficient Error Handling**
   ```typescript
   // Bad
   const data = await fetchData();
   return data;
   
   // Good
   try {
     const data = await fetchData();
     if (!data) throw new Error('No data received');
     return data;
   } catch (error) {
     logger.error('Failed to fetch data', error);
     throw new APIError('Data fetch failed', 500);
   }
   ```

3. **Ignoring Type Safety**
   ```typescript
   // Bad
   function processOrder(order: any) { }
   
   // Good
   function processOrder(order: ValidatedOrder) { }
   ```

### Learning Resources

1. **Daily Learning Goals**
   - Morning: Review previous day's code
   - Coding: Apply one new pattern
   - Evening: Document learnings

2. **Weekly Milestones**
   - Week 1: Complete authentication slice
   - Week 2: Implement market data tools
   - Week 3: Trading operations
   - Week 4: Production readiness

### Mentorship Guidelines

1. **15-Minute Rule**: Try solving for 15 minutes before asking for help
2. **Document Questions**: Keep a learning journal
3. **Code Reviews**: Request review after each task
4. **Pair Programming**: Schedule 2 sessions per week

## Configuration Files

### package.json (Scripts Section)
```json
{
  "scripts": {
    "dev": "encore run",
    "build": "encore build",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "check": "bun run lint && bun run type-check",
    "lint": "bunx @biomejs/biome check .",
    "lint:fix": "bunx @biomejs/biome check --apply .",
    "format": "bunx @biomejs/biome format --write .",
    "type-check": "bunx tsc --noEmit"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "types": ["bun-types"]
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### biome.json
```json
{
  "schema": "https://biomejs.dev/schemas/1.4.1/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExtraBooleanCast": "error",
        "noMultipleSpacesInRegularExpressionLiterals": "error",
        "noUselessCatch": "error",
        "noUselessTypeConstraint": "error"
      },
      "correctness": {
        "noConstAssign": "error",
        "noGlobalObjectCalls": "error",
        "noInvalidConstructorSuper": "error",
        "noUnusedVariables": "error"
      },
      "security": {
        "noDangerouslySetInnerHtml": "error"
      },
      "style": {
        "noNonNullAssertion": "warn",
        "useConst": "error",
        "useTemplate": "error"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noFallthroughSwitchClause": "error",
        "noGlobalAssign": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "jsxQuoteStyle": "double",
      "quoteProperties": "asNeeded",
      "trailingComma": "es5",
      "semicolons": "always",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "quoteStyle": "single"
    }
  },
  "json": {
    "formatter": {
      "enabled": true
    }
  }
}
```

### bunfig.toml (Bun Configuration)
```toml
[install]
# Install packages from npm registry
registry = "https://registry.npmjs.org/"

# Always install exact versions
exact = true

# Use cache for faster installs
cache = true

[test]
# Test configuration
preload = ["./tests/setup.ts"]
coverage = true

[build]
# Build configuration for production
minify = true
sourcemap = true
target = "node"
```

### .husky/pre-commit
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run code quality checks
bun run check
bun run test
```

### lint-staged.config.js
```javascript
export default {
  "*.{ts,js,json}": ["bunx @biomejs/biome check --apply"],
  "*.ts": ["bun run type-check"]
};
```

## Deployment Checklist

### Pre-Production
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Secrets properly stored

### Production Deployment
- [ ] Database migrations tested
- [ ] Rollback plan prepared
- [ ] Monitoring alerts configured
- [ ] Load testing completed
- [ ] API versioning implemented
- [ ] Client communication sent

## Success Metrics

### Technical Metrics
- Test coverage > 85%
- API response time < 200ms
- Error rate < 0.1%
- Uptime > 99.9%
- Code formatting compliance: 100% (enforced by Biome.js)
- Lint check time < 5 seconds (Biome.js performance)

### Development Metrics
- PR turnaround < 24 hours
- Bug fix time < 4 hours
- Feature completion rate > 90%
- Code review feedback incorporated > 95%
- Test execution time < 30 seconds (Bun performance)
- Local development startup time < 10 seconds

## Troubleshooting

### Common Issues with Bun
```bash
# If Bun installation fails
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or ~/.zshrc

# Clear Bun cache if needed
bun pm cache rm

# Check Bun version compatibility
bun --version  # Should be 1.0+
```

### Common Issues with Biome.js
```bash
# If Biome.js check fails
bunx @biomejs/biome check --apply .

# Reset Biome configuration
bunx @biomejs/biome init --overwrite

# Check specific file
bunx @biomejs/biome check ./src/auth/auth.ts
```

### Development Environment Issues
```bash
# Reset everything and start fresh
rm -rf node_modules bun.lockb
bun install
bun run setup

# Check TypeScript compilation
bunx tsc --noEmit

# Run tests with verbose output
bun test --verbose
```

## Conclusion

This implementation guide provides a structured approach to building a MEXC MCP Server using cutting-edge TypeScript tooling. The combination of Bun and Biome.js delivers significant performance improvements over traditional Node.js/ESLint/Prettier setups:

### Key Benefits of This Stack:
- **3x faster** package installation and test execution with Bun
- **35x faster** linting with Biome.js vs ESLint
- **Single configuration** for both linting and formatting
- **Built-in TypeScript support** without additional setup
- **Improved developer experience** with faster feedback loops

By following the vertical slice architecture, junior developers can contribute meaningful features while learning modern best practices. The emphasis on TDD, type safety, and comprehensive testing ensures a robust, maintainable codebase suitable for production use.

Remember: Start small, test thoroughly, and iterate based on feedback. Each slice builds upon previous work, creating a complete, professional-grade MCP server for cryptocurrency trading with modern tooling that makes development both faster and more enjoyable.