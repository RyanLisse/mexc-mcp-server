# Encore.ts Validation Patterns and Best Practices

This document provides comprehensive guidance on using Encore.ts validation patterns to replace Zod schemas with native TypeScript interfaces and built-in validation decorators.

## Overview

Encore.ts provides type-safe validation through:
1. **Native TypeScript types** for compile-time and runtime validation
2. **Built-in validation primitives** for advanced validation rules
3. **Performance optimization** through Rust-based validation engine
4. **Seamless integration** with the TypeScript type system
5. **Automatic validation** at API boundaries without manual checks

### Key Benefits
- **Type Safety**: Compile-time and runtime validation
- **Performance**: Validation implemented in Rust for speed
- **Developer Experience**: Zero boilerplate validation code
- **Protocol Support**: Validates request data from body, query, headers, and path

## Basic API Definition Patterns

### Simple API Endpoint
```typescript
import { api } from "encore.dev/api";

interface PingRequest {
  name: string;
}

interface PingResponse {
  message: string;
}

export const ping = api(
  { method: "POST", path: "/ping" },
  async (req: PingRequest): Promise<PingResponse> => {
    return { message: `Hello ${req.name}!` };
  }
);
```

### API with Optional Parameters
```typescript
interface GetTickerRequest {
  symbol: string;        // Required
  convert?: string;      // Optional
}

export const getTicker = api(
  { method: "POST", path: "/ticker" },
  async (req: GetTickerRequest): Promise<TickerResponse> => {
    // Implementation
  }
);
```

## Built-in Validation Primitives

### Official Encore.ts Validation Types
According to the official documentation, Encore.ts provides the following validation primitives:

```typescript
// No explicit imports needed - validation is built into TypeScript intersection types
interface ValidationExample {
  // Numeric constraints
  age: number & (Min<18> & Max<100>);
  
  // String constraints with Min/Max for length
  name: string & (Min<2> & Max<50>);
  
  // Email validation
  email: string & IsEmail;
  
  // URL validation  
  website: string & IsURL;
  
  // Pattern matching
  symbol: string & Match<"^[A-Z0-9]+$">;
}
```

### Validation Rule Types
- **Min<N>**: Minimum value for numbers, minimum length for strings/arrays
- **Max<N>**: Maximum value for numbers, maximum length for strings/arrays  
- **IsEmail**: Email format validation
- **IsURL**: URL format validation
- **Match<pattern>**: Regular expression pattern matching

### Numeric Validation
```typescript
interface NumericValidationRequest {
  // Number between 3 and 1000 (inclusive)
  count: number & (Min<3> & Max<1000>);
  
  // Optional number with validation
  limit?: number & (Min<1> & Max<100>);
}
```

### String Length Validation
```typescript
interface StringValidationRequest {
  // String between 5 and 20 characters
  username: string & (MinLen<5> & MaxLen<20>);
  
  // Minimum length only
  description: string & MinLen<10>;
  
  // Maximum length only
  shortCode: string & MaxLen<5>;
}
```

### Format Validation
```typescript
interface FormatValidationRequest {
  email: string & IsEmail;
  website: string & IsURL;
  
  // Pattern matching
  symbol: string & StartsWith<"BTC">;
  filename: string & EndsWith<".json">;
  
  // Regex validation (using Match from official docs)
  phoneNumber: string & Match<"^\\+?[1-9]\\d{1,14}$">;
}
```

### Array Validation
```typescript
interface ArrayValidationRequest {
  // Array of validated emails with max length
  emails: Array<string & IsEmail> & MaxLen<10>;
  
  // Array of numbers with validation
  prices: Array<number & (Min<0> & Max<1000000>)>;
  
  // Simple array with length constraints
  tags: string[] & (MinLen<1> & MaxLen<5>);
}
```

### Complex Union Types
```typescript
interface ComplexValidationRequest {
  // Either a URL or an email
  contact: string & (IsURL | IsEmail);
  
  // Combined validations
  apiKey: string & (MinLen<32> & MaxLen<64> & StartsWith<"mexc_">);
}
```

## Multi-Source Data Validation

### Query Parameters, Headers, and Body
```typescript
import { Header, Query, api } from "encore.dev/api";

interface MultiSourceRequest {
  // From request body
  symbol: string & (MinLen<3> & MaxLen<10>);
  
  // From query parameters
  limit?: Query<number & (Min<1> & Max<1000>)>;
  
  // From headers
  apiKey: Header<"X-API-Key"> & MinLen<32>;
  
  // Optional header
  userAgent?: Header<"User-Agent">;
}

export const getMarketData = api(
  { method: "POST", path: "/market-data" },
  async (req: MultiSourceRequest): Promise<MarketDataResponse> => {
    // All data is automatically validated and typed
    return { data: await fetchData(req.symbol, req.limit) };
  }
);
```

## Path Parameters

### Basic Path Parameters
```typescript
interface GetOrderRequest {
  // Path parameters must match the function parameter names
  orderId: string & MinLen<1>;
  userId: number & Min<1>;
}

export const getOrder = api(
  { method: "GET", path: "/users/:userId/orders/:orderId" },
  async (req: GetOrderRequest): Promise<OrderResponse> => {
    // orderId and userId are automatically extracted and validated
  }
);
```

### Wildcard Path Parameters
```typescript
interface GetFileRequest {
  id: number;
  path: string & MinLen<1>;
}

export const getFile = api(
  { method: "GET", path: "/files/:id/*path" },
  async (req: GetFileRequest): Promise<FileResponse> => {
    // path captures everything after /files/{id}/
  }
);
```

## Migration from Zod to Encore.ts

### Before (Zod)
```typescript
import { z } from 'zod';

const GetTickerSchema = z.object({
  symbol: z.string().min(3).max(10).regex(/^[A-Z0-9]+$/),
  convert: z.string().optional(),
});

type GetTickerRequest = z.infer<typeof GetTickerSchema>;
```

### After (Encore.ts)
```typescript
// Official Encore.ts validation pattern
interface GetTickerRequest {
  symbol: string & (Min<3> & Max<10>); // For string length validation
  convert?: string;
}

// With regex pattern (official syntax)
interface GetTickerRequestWithPattern {
  symbol: string & Match<"^[A-Z0-9]+$">;
  convert?: string;
}
```

### Complex Migration Example
```typescript
// Before (Zod)
const OrderBookSchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9]+$/),
  limit: z.number().min(5).max(1000).default(100),
});

// After (Encore.ts)
interface GetOrderBookRequest {
  symbol: string & MatchesRegexp<"^[A-Z0-9]+$">;
  limit?: number & (Min<5> & Max<1000>); // Default handled in implementation
}
```

## Real-World Examples from MEXC MCP Server

### Market Data API
```typescript
// Ticker endpoint with symbol validation
interface GetTickerRequest {
  symbol: string & (MinLen<3> & MatchesRegexp<"^[A-Z0-9]+$">);
  convert?: string & MaxLen<10>;
}

export const getTicker = api(
  { expose: true, method: 'POST', path: '/market-data/ticker' },
  async (req: GetTickerRequest): Promise<MarketDataResponse<TickerData>> => {
    // Automatic validation ensures symbol is valid
    return await executeGetTicker(req);
  }
);
```

### Order Book with Limits
```typescript
interface GetOrderBookRequest {
  symbol: string & MatchesRegexp<"^[A-Z0-9]+$">;
  limit?: number & (Min<5> & Max<1000>);
}

export const getOrderBook = api(
  { expose: true, method: 'POST', path: '/market-data/order-book' },
  async (req: GetOrderBookRequest): Promise<MarketDataResponse<OrderBookData>> => {
    // Default limit handling in implementation
    const limit = req.limit ?? 100;
    return await executeGetOrderBook({ ...req, limit });
  }
);
```

### Authentication with API Key Validation
```typescript
interface AuthRequest {
  apiKey: string & (MinLen<32> & MaxLen<128> & StartsWith<"mexc_">);
  secretKey: string & (MinLen<32> & MaxLen<128>);
}

export const authenticate = api(
  { method: "POST", path: "/auth" },
  async (req: AuthRequest): Promise<AuthResponse> => {
    // Keys are pre-validated for format and length
    return await validateCredentials(req);
  }
);
```

## Testing with Vitest

### Test Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,ts,tsx}'],
    testTimeout: 30000,
  },
});
```

### Testing Validation
```typescript
// market-data.test.ts
import { describe, it, expect } from 'vitest';
import { getTicker } from './api.js';

describe('Market Data API Validation', () => {
  it('should validate symbol format', async () => {
    // Valid symbol
    const validRequest = { symbol: 'BTCUSDT' };
    const result = await getTicker(validRequest);
    expect(result).toBeDefined();
  });

  it('should reject invalid symbol format', async () => {
    // Invalid symbol (lowercase)
    const invalidRequest = { symbol: 'btcusdt' };
    
    // Encore.ts will automatically reject this at the framework level
    // before your handler function is called
    await expect(getTicker(invalidRequest)).rejects.toThrow();
  });

  it('should handle optional parameters', async () => {
    const request = { symbol: 'BTCUSDT', convert: 'USD' };
    const result = await getTicker(request);
    expect(result.data).toBeDefined();
  });
});
```

### Integration Testing
```typescript
describe('MEXC API Integration', () => {
  it('should fetch real market data', async () => {
    const request = { symbol: 'BTCUSDT' };
    const response = await getTicker(request);
    
    expect(response.data.symbol).toBe('BTCUSDT');
    expect(typeof response.data.price).toBe('string');
    expect(response.timestamp).toBeGreaterThan(0);
  });
});
```

## Performance Considerations

### Validation Performance
- **Rust-based validation**: 9x faster than Express.js, 3x faster than Elysia/Hono
- **Pre-computed validation**: Rules are analyzed at startup and optimized
- **Zero JavaScript overhead**: Invalid requests never reach your handler code

### Caching with Validation
```typescript
interface CachedRequest {
  symbol: string & MatchesRegexp<"^[A-Z0-9]+$">;
  ttl?: number & (Min<60> & Max<3600>); // 1 minute to 1 hour
}

export const getCachedData = api(
  { method: "GET", path: "/cached/:symbol" },
  async (req: CachedRequest): Promise<CachedResponse> => {
    const ttl = req.ttl ?? 300; // Default 5 minutes
    return await getCachedMarketData(req.symbol, ttl);
  }
);
```

## Best Practices

### 1. Use Descriptive Interface Names
```typescript
// Good
interface GetMarketTickerRequest { ... }
interface CreateOrderRequest { ... }

// Avoid
interface Request { ... }
interface Data { ... }
```

### 2. Combine Validation Rules Logically
```typescript
// Good: Logical grouping
interface SymbolRequest {
  symbol: string & (MinLen<3> & MaxLen<20> & MatchesRegexp<"^[A-Z0-9]+$">);
}

// Good: Separate concerns
interface PaginationRequest {
  limit?: number & (Min<1> & Max<100>);
  offset?: number & Min<0>;
}
```

### 3. Handle Defaults in Implementation
```typescript
interface RequestWithDefaults {
  symbol: string;
  limit?: number & (Min<1> & Max<1000>);
}

export const handler = api(
  { method: "POST", path: "/data" },
  async (req: RequestWithDefaults) => {
    // Handle defaults in your code, not in types
    const limit = req.limit ?? 100;
    return await fetchData(req.symbol, limit);
  }
);
```

### 4. Use Union Types for Flexible Validation
```typescript
interface FlexibleContactRequest {
  contact: string & (IsEmail | IsURL);
  priority: "low" | "medium" | "high";
}
```

### 5. Leverage Path Parameters for RESTful APIs
```typescript
interface RESTfulRequest {
  userId: number & Min<1>;
  orderId: string & MinLen<1>;
  status?: "pending" | "completed" | "cancelled";
}

export const updateOrder = api(
  { method: "PUT", path: "/users/:userId/orders/:orderId" },
  async (req: RESTfulRequest): Promise<OrderResponse> => {
    // userId and orderId are automatically extracted from path
    return await updateUserOrder(req.userId, req.orderId, req.status);
  }
);
```

## Current Codebase Migration Analysis

### Existing Validation Patterns to Migrate

#### 1. JSON Schema in `tools/schemas.ts`
**Current Pattern:**
```typescript
export const MCPToolSchemas = {
  ticker: {
    type: 'object',
    properties: {
      symbol: { type: 'string', minLength: 1, description: 'Trading symbol' },
    },
    required: ['symbol'],
  }
};
```

**Encore.ts Migration:**
```typescript
interface GetTickerRequest {
  symbol: string & Min<1>; // Replaces minLength: 1
}
```

#### 2. Manual Validation in `trading/api.ts`
**Current Pattern:**
```typescript
function validatePlaceOrderArgs(args: Record<string, unknown>): PlaceOrderArgs {
  if (typeof args.symbol !== 'string' || !args.symbol) {
    throw new Error('symbol is required and must be a string');
  }
  if (typeof args.side !== 'string' || !['buy', 'sell'].includes(args.side)) {
    throw new Error('side is required and must be "buy" or "sell"');
  }
  // ... more manual validation
}
```

**Encore.ts Migration:**
```typescript
interface PlaceOrderRequest {
  symbol: string & Min<1>;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number & Min<0.000001>;
  price?: number & Min<0>;
}

export const placeOrder = api(
  { expose: true, method: 'POST', path: '/trading/order' },
  async (req: PlaceOrderRequest): Promise<OrderResponse> => {
    // No manual validation needed - Encore handles it automatically
    return await executePlaceOrder(req);
  }
);
```

#### 3. Symbol Validation Pattern
**Current Pattern:**
```typescript
export function isValidMEXCSymbol(symbol: string): boolean {
  return /^[A-Z0-9]{3,10}$/.test(symbol.toUpperCase());
}
```

**Encore.ts Migration:**
```typescript
interface SymbolRequest {
  symbol: string & (Min<3> & Max<10> & Match<"^[A-Z0-9]+$">);
}
```

### Migration Priority

1. **High Priority**: API endpoints in `market-data/api.ts`, `auth/api.ts`, `trading/api.ts`
2. **Medium Priority**: Tool validation in `tools/` directory
3. **Low Priority**: Helper functions and utilities

### Migration Benefits for MEXC MCP Server

1. **Performance Improvement**: Rust-based validation will be faster than current JSON Schema validation
2. **Code Reduction**: Eliminate ~200 lines of manual validation code
3. **Type Safety**: Compile-time validation catches errors earlier
4. **Maintainability**: Single source of truth for validation rules

## Common Patterns Summary

1. **Replace Zod schemas** with TypeScript interfaces
2. **Use validation primitives** for runtime validation  
3. **Combine rules** with `&` (and) and `|` (or) operators
4. **Handle optional fields** with `?` syntax
5. **Use path parameters** for RESTful routing
6. **Test validation** with integration tests
7. **Leverage performance** of Rust-based validation
8. **Migrate incrementally** starting with API endpoints

This approach provides type safety, runtime validation, and exceptional performance while maintaining clean, readable TypeScript code.