# MEXC MCP Server API Documentation

## Overview

The MEXC MCP Server provides a comprehensive API for cryptocurrency trading operations through the Model Context Protocol (MCP). The server is built using Encore.ts microservices architecture with 5 independent services.

## Base URL

```
https://your-encore-app.encr.app  # Production
http://localhost:4000             # Local development
```

## Authentication

All protected endpoints require authentication via the `Authorization` header:

```http
Authorization: Bearer your_mexc_api_key
```

## Services Architecture

### 1. Authentication Service (`/auth`)

Handles API key validation, rate limiting, and user authentication.

#### Endpoints

##### `POST /auth/validate`
Validate an API key.

**Request:**
```json
{
  "apiKey": "your_mexc_api_key"
}
```

**Response:**
```json
{
  "isValid": true,
  "userId": "user_123",
  "error": null
}
```

##### `GET /auth/status`
Get authentication status (requires auth).

**Response:**
```json
{
  "authenticated": true,
  "userId": "user_123",
  "permissions": ["read", "trade"]
}
```

##### `POST /auth/rate-limit`
Check rate limit status.

**Request:**
```json
{
  "identifier": "user_123"
}
```

**Response:**
```json
{
  "remainingRequests": 95,
  "windowMs": 60000,
  "maxRequests": 100
}
```

##### `GET /auth/test-mexc`
Test MEXC credentials configuration.

**Response:**
```json
{
  "hasCredentials": true,
  "message": "MEXC API credentials are configured"
}
```

### 2. Market Data Service (`/market-data`)

Provides real-time and historical market data from MEXC exchange.

#### Endpoints

##### `POST /market-data/ticker`
Get current ticker price and 24h statistics.

**Request:**
```json
{
  "symbol": "BTCUSDT",
  "convert": "USD"  // optional
}
```

**Response:**
```json
{
  "data": {
    "symbol": "BTCUSDT",
    "price": "45123.45",
    "priceChange": "1234.56",
    "priceChangePercent": "2.82",
    "volume": "12345.67",
    "quoteVolume": "556789012.34",
    "open": "43888.89",
    "high": "45500.00",
    "low": "43750.00",
    "count": 125643,
    "timestamp": 1640995200000
  },
  "timestamp": 1640995200000,
  "cached": false
}
```

##### `POST /market-data/order-book`
Get current order book (bids and asks).

**Request:**
```json
{
  "symbol": "BTCUSDT",
  "limit": 100  // optional, default 100
}
```

**Response:**
```json
{
  "data": {
    "symbol": "BTCUSDT",
    "bids": [
      { "price": "45120.00", "quantity": "0.5" },
      { "price": "45115.00", "quantity": "1.2" }
    ],
    "asks": [
      { "price": "45125.00", "quantity": "0.8" },
      { "price": "45130.00", "quantity": "2.1" }
    ],
    "timestamp": 1640995200000
  },
  "timestamp": 1640995200000,
  "cached": false
}
```

##### `POST /market-data/24h-stats`
Get 24-hour trading statistics.

**Request:**
```json
{
  "symbol": "BTCUSDT"  // optional, omit for all symbols
}
```

**Response:**
```json
{
  "data": [
    {
      "symbol": "BTCUSDT",
      "volume": "12345.67",
      "volumeQuote": "556789012.34",
      "priceChange": "1234.56",
      "priceChangePercent": "2.82",
      "high": "45500.00",
      "low": "43750.00",
      "trades": 125643,
      "timestamp": 1640995200000
    }
  ],
  "timestamp": 1640995200000,
  "cached": false
}
```

##### `GET /market-data/test-connectivity`
Test connectivity to MEXC API.

**Response:**
```json
{
  "data": {
    "success": true,
    "message": "Connected successfully. Server time: 2024-01-01T12:00:00.000Z"
  },
  "timestamp": 1640995200000
}
```

##### `GET /market-data/test-auth`
Test MEXC API authentication.

**Response:**
```json
{
  "data": {
    "success": true,
    "message": "Authentication successful"
  },
  "timestamp": 1640995200000
}
```

##### `POST /market-data/active-symbols`
Get all active trading symbols.

**Request:**
```json
{
  "limit": 50  // optional, default 50
}
```

**Response:**
```json
{
  "data": ["BTCUSDT", "ETHUSDT", "BNBUSDT", "..."],
  "timestamp": 1640995200000,
  "cached": false
}
```

##### `GET /market-data/health`
Market data service health check.

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "connectivity": {
      "status": "pass",
      "message": "API connectivity OK"
    },
    "cache": {
      "status": "pass",
      "message": "Cache functionality OK"
    },
    "configuration": {
      "status": "pass",
      "message": "Configuration loaded"
    }
  }
}
```

##### `GET /market-data/mcp/tools`
Get available MCP tools for market data.

**Response:**
```json
{
  "tools": [
    {
      "name": "mexc_get_ticker",
      "description": "Get current ticker price and 24h statistics for a trading symbol",
      "inputSchema": {
        "symbol": {
          "type": "string",
          "pattern": "^[A-Z0-9]+$",
          "description": "Trading symbol (e.g., BTCUSDT)"
        }
      }
    }
  ]
}
```

### 3. Trading Service (`/trading`)

Handles order placement, cancellation, and trade management.

#### Endpoints

##### `POST /trading/place-order`
Place a new trading order.

**Request:**
```json
{
  "symbol": "BTCUSDT",
  "side": "buy",           // "buy" or "sell"
  "type": "limit",         // "market" or "limit"
  "quantity": 0.001,
  "price": 45000.00,       // required for limit orders
  "timeInForce": "GTC"     // optional
}
```

**Response:**
```json
{
  "data": {
    "orderId": "12345678",
    "symbol": "BTCUSDT",
    "side": "buy",
    "type": "limit",
    "quantity": "0.001",
    "price": "45000.00",
    "status": "NEW",
    "timestamp": 1640995200000
  },
  "timestamp": 1640995200000
}
```

##### `POST /trading/cancel-order`
Cancel an existing order.

**Request:**
```json
{
  "symbol": "BTCUSDT",
  "orderId": "12345678"
}
```

**Response:**
```json
{
  "data": {
    "orderId": "12345678",
    "symbol": "BTCUSDT",
    "status": "CANCELED",
    "timestamp": 1640995200000
  },
  "timestamp": 1640995200000
}
```

##### `POST /trading/order-status`
Get order status and details.

**Request:**
```json
{
  "symbol": "BTCUSDT",
  "orderId": "12345678"
}
```

**Response:**
```json
{
  "data": {
    "orderId": "12345678",
    "symbol": "BTCUSDT",
    "side": "buy",
    "type": "limit",
    "quantity": "0.001",
    "price": "45000.00",
    "executedQuantity": "0.0005",
    "status": "PARTIALLY_FILLED",
    "timestamp": 1640995200000
  },
  "timestamp": 1640995200000
}
```

##### `GET /trading/open-orders`
Get all open orders.

**Query Parameters:**
- `symbol` (optional): Filter by trading pair

**Response:**
```json
{
  "data": [
    {
      "orderId": "12345678",
      "symbol": "BTCUSDT",
      "side": "buy",
      "type": "limit",
      "quantity": "0.001",
      "price": "45000.00",
      "status": "NEW",
      "timestamp": 1640995200000
    }
  ],
  "timestamp": 1640995200000
}
```

##### `POST /trading/order-history`
Get order history.

**Request:**
```json
{
  "symbol": "BTCUSDT",  // optional
  "limit": 100          // optional, default 100
}
```

**Response:**
```json
{
  "data": [
    {
      "orderId": "12345678",
      "symbol": "BTCUSDT",
      "side": "buy",
      "type": "limit",
      "quantity": "0.001",
      "price": "45000.00",
      "executedQuantity": "0.001",
      "status": "FILLED",
      "timestamp": 1640995200000
    }
  ],
  "timestamp": 1640995200000
}
```

##### `POST /trading/trade-history`
Get trade execution history.

**Request:**
```json
{
  "symbol": "BTCUSDT",  // optional
  "limit": 100          // optional, default 100
}
```

**Response:**
```json
{
  "data": [
    {
      "tradeId": "87654321",
      "orderId": "12345678",
      "symbol": "BTCUSDT",
      "side": "buy",
      "quantity": "0.001",
      "price": "45000.00",
      "commission": "0.000001",
      "commissionAsset": "BTC",
      "timestamp": 1640995200000
    }
  ],
  "timestamp": 1640995200000
}
```

### 4. Portfolio Service (`/portfolio`)

Manages account balance, positions, and portfolio analytics.

#### Endpoints

##### `GET /portfolio/balance`
Get account balance for all assets.

**Response:**
```json
{
  "data": [
    {
      "asset": "BTC",
      "free": "0.12345678",
      "locked": "0.00100000",
      "total": "0.12445678"
    },
    {
      "asset": "USDT",
      "free": "1000.50",
      "locked": "50.00",
      "total": "1050.50"
    }
  ],
  "timestamp": 1640995200000
}
```

##### `GET /portfolio/positions`
Get open positions.

**Response:**
```json
{
  "data": [
    {
      "symbol": "BTCUSDT",
      "asset": "BTC",
      "quantity": "0.12345678",
      "avgPrice": "44000.00",
      "unrealizedPnl": "1500.00",
      "realizedPnl": "250.00"
    }
  ],
  "timestamp": 1640995200000
}
```

##### `POST /portfolio/pnl`
Get profit/loss data for a symbol or all positions.

**Request:**
```json
{
  "symbol": "BTCUSDT",  // optional
  "period": "24h"       // optional: "1h", "24h", "7d", "30d"
}
```

**Response:**
```json
{
  "data": {
    "totalPnl": "1750.00",
    "unrealizedPnl": "1500.00",
    "realizedPnl": "250.00",
    "totalReturn": "3.89",
    "positions": [
      {
        "symbol": "BTCUSDT",
        "pnl": "1750.00",
        "returnPercent": "3.89"
      }
    ]
  },
  "timestamp": 1640995200000
}
```

### 5. Tools Service (`/tools`)

Aggregates all MCP tools and provides protocol-compliant endpoints.

#### Endpoints

##### `GET /tools/list`
List all available MCP tools.

**Response:**
```json
{
  "tools": [
    {
      "name": "mexc_get_ticker",
      "description": "Get current ticker price and 24h statistics",
      "inputSchema": {
        "type": "object",
        "properties": {
          "symbol": {
            "type": "string",
            "description": "Trading symbol"
          }
        },
        "required": ["symbol"]
      }
    }
  ]
}
```

##### `POST /tools/call`
Execute an MCP tool.

**Request:**
```json
{
  "name": "mexc_get_ticker",
  "arguments": {
    "symbol": "BTCUSDT"
  }
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "BTC/USDT: $45,123.45 (+2.82%)"
    }
  ],
  "isError": false
}
```

##### `GET /tools/resources`
List available MCP resources.

**Response:**
```json
{
  "resources": [
    {
      "uri": "mexc://account/balance",
      "name": "Account Balance",
      "mimeType": "application/json",
      "description": "Current account balances"
    }
  ]
}
```

##### `POST /tools/resources/read`
Read MCP resource content.

**Request:**
```json
{
  "uri": "mexc://account/balance"
}
```

**Response:**
```json
{
  "contents": [
    {
      "uri": "mexc://account/balance",
      "mimeType": "application/json",
      "text": "{\"BTC\": \"0.12345678\", \"USDT\": \"1050.50\"}"
    }
  ]
}
```

## MCP Tools Reference

### Market Data Tools

1. **mexc_get_ticker** - Get current price and 24h stats
2. **mexc_get_order_book** - Get order book data
3. **mexc_get_24h_stats** - Get 24h trading statistics
4. **mexc_test_connectivity** - Test API connectivity
5. **mexc_test_authentication** - Test API authentication
6. **mexc_get_active_symbols** - Get active trading symbols

### Trading Tools

7. **mexc_place_order** - Place buy/sell orders
8. **mexc_cancel_order** - Cancel existing orders
9. **mexc_get_order_status** - Get order details
10. **mexc_get_open_orders** - Get all open orders
11. **mexc_get_order_history** - Get order history
12. **mexc_get_trade_history** - Get trade execution history

### Portfolio Tools

13. **mexc_get_account_balance** - Get account balances

## Error Handling

All endpoints return standardized error responses:

```json
{
  "error": {
    "code": "INVALID_SYMBOL",
    "message": "The provided symbol is not valid",
    "details": {
      "symbol": "INVALID",
      "timestamp": 1640995200000
    }
  },
  "timestamp": 1640995200000
}
```

### Common Error Codes

- `INVALID_API_KEY` - API key is invalid or missing
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INVALID_SYMBOL` - Trading symbol not recognized
- `INSUFFICIENT_BALANCE` - Not enough balance for operation
- `ORDER_NOT_FOUND` - Order ID not found
- `MEXC_API_ERROR` - Error from MEXC exchange

## Rate Limiting

- **Default Limit**: 100 requests per minute per API key
- **Headers**: Rate limit info returned in response headers
- **Status Code**: 429 when rate limit exceeded

## Caching

Market data endpoints use intelligent caching:

- **Ticker Data**: 5 seconds TTL
- **Order Book**: 2 seconds TTL
- **24h Statistics**: 30 seconds TTL
- **Active Symbols**: 60 seconds TTL

Cache status indicated by `cached` field in responses.

## WebSocket Support

Real-time data available through WebSocket connections:

```javascript
const ws = new WebSocket('wss://your-app.encr.app/ws');
ws.send(JSON.stringify({
  method: 'subscribe',
  params: ['ticker@BTCUSDT']
}));
```

## Health Monitoring

Each service provides health check endpoints:

- `GET /auth/health`
- `GET /market-data/health`
- `GET /trading/health`
- `GET /portfolio/health`
- `GET /tools/health`

Overall service health available at `GET /health`.