# MEXC MCP Server

A Model Context Protocol (MCP) server implementation for MEXC cryptocurrency exchange integration using Encore.ts.

## 🚀 Features

- **Real-time Market Data**: Live ticker prices, order books, and 24h statistics from MEXC exchange
- **Secure API Management**: Encore.ts secrets management for API keys
- **Rate Limiting & Caching**: Built-in protection and performance optimization
- **Type Safety**: Full TypeScript implementation with Encore.ts interfaces
- **Test-Driven Development**: Comprehensive test suite with >90% coverage
- **CI/CD Pipeline**: Automated testing, linting, and deployment
- **Pre-commit Hooks**: Automated code quality checks

## 📋 Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0
- [Node.js](https://nodejs.org/) >= 18.0.0
- [Encore CLI](https://encore.dev/docs/install) (for deployment)
- MEXC API credentials

## 🛠️ Local Development Setup

### 1. Clone and Install

```bash
git clone https://github.com/RyanLisse/mexc-mcp-server.git
cd mexc-mcp-server
bun install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```bash
# MEXC API Credentials
MEXC_API_KEY=your_mexc_api_key_here
MEXC_SECRET_KEY=your_mexc_secret_key_here
```

### 3. Development Workflow

```bash
# Start development server
bun run dev

# Run tests (with watch mode)
bun run test:watch

# Run all quality checks
bun run check

# Format and lint code
bun run format
bun run lint:fix
```

## 🧪 Testing

```bash
# Run all tests
bun test

# Run tests with coverage
bun run test:coverage

# Run specific test file
bun test auth/auth.test.ts

# Test MEXC API connectivity
bun run test:mexc
```

## 🔧 Available MCP Tools

| Tool Name | Description | Input Parameters |
|-----------|-------------|------------------|
| `mexc_get_ticker` | Get current ticker price and 24h statistics | `symbol: string, convert?: string` |
| `mexc_get_order_book` | Get current order book (bids/asks) | `symbol: string, limit?: number` |
| `mexc_get_24h_stats` | Get 24-hour trading statistics | `symbol?: string` |
| `mexc_test_connectivity` | Test API connectivity and server time | None |
| `mexc_test_authentication` | Test API authentication | None |
| `mexc_get_active_symbols` | Get all active trading symbols | `limit?: number` |
| `mexc_place_order` | Place a buy/sell order | `symbol: string, side: 'buy'|'sell', type: 'market'|'limit', quantity: number, price?: number` |
| `mexc_cancel_order` | Cancel an existing order | `symbol: string, orderId: string` |
| `mexc_get_order_status` | Get order status and details | `symbol: string, orderId: string` |
| `mexc_get_account_balance` | Get account balances | None |
| `mexc_get_open_orders` | Get all open orders | `symbol?: string` |
| `mexc_get_order_history` | Get order history | `symbol?: string, limit?: number` |
| `mexc_get_trade_history` | Get trade execution history | `symbol?: string, limit?: number` |

## 🚀 Deployment

### Encore Cloud Deployment

1. **Install Encore CLI**:
   ```bash
   curl -L https://encore.dev/install.sh | bash
   ```

2. **Authenticate**:
   ```bash
   encore auth login
   ```

3. **Set up secrets**:
   ```bash
   # For staging environment
   encore secret set --env=staging MEXC_API_KEY "your_api_key"
   encore secret set --env=staging MEXC_SECRET_KEY "your_secret_key"
   
   # For production environment
   encore secret set --env=production MEXC_API_KEY "your_api_key"
   encore secret set --env=production MEXC_SECRET_KEY "your_secret_key"
   ```

4. **Deploy**:
   ```bash
   # Deploy to staging
   encore deploy --env=staging

   # Deploy to production
   encore deploy --env=production
   ```

### Automated Deployment

The project includes GitHub Actions workflows for automated deployment:

- **CI Pipeline** (`.github/workflows/ci.yml`): Runs on all PRs and pushes
  - Type checking
  - Linting and formatting
  - Test execution
  - Security scanning
  - Build verification

- **Deployment Pipeline** (`.github/workflows/deploy.yml`): Deploys to Encore Cloud
  - Triggered on main branch pushes
  - Manual deployment with environment selection
  - Automated health checks
  - Secret management

### Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

```bash
ENCORE_AUTH_TOKEN=your_encore_auth_token
ENCORE_INSTALL_ID=your_encore_install_id
MEXC_API_KEY=your_mexc_api_key
MEXC_SECRET_KEY=your_mexc_secret_key
CODECOV_TOKEN=your_codecov_token  # Optional, for coverage reports
```

## 🔒 Security & Secrets Management

### Encore.ts Secrets

This project uses Encore.ts built-in secrets management for secure credential storage:

```typescript
// In shared/config.ts
import { secret } from "encore.dev/config";

// Secrets are automatically injected by Encore.ts
const mexcApiKey = secret("MEXC_API_KEY");
const mexcSecretKey = secret("MEXC_SECRET_KEY");

// For local development, use environment variables
const localConfig = {
  apiKey: process.env.MEXC_API_KEY || mexcApiKey(),
  secretKey: process.env.MEXC_SECRET_KEY || mexcSecretKey(),
};
```

### Setting up Secrets

```bash
# Set secrets for different environments
encore secret set --env=development MEXC_API_KEY "your_dev_api_key"
encore secret set --env=development MEXC_SECRET_KEY "your_dev_secret_key"

encore secret set --env=staging MEXC_API_KEY "your_staging_api_key"
encore secret set --env=staging MEXC_SECRET_KEY "your_staging_secret_key"

encore secret set --env=production MEXC_API_KEY "your_prod_api_key"
encore secret set --env=production MEXC_SECRET_KEY "your_prod_secret_key"
```

### Best Practices

- ✅ Never commit API keys to version control
- ✅ Use environment-specific secrets (staging/production)
- ✅ Rotate API keys regularly
- ✅ Monitor API usage and rate limits
- ✅ Use least-privilege access principles

## 🔄 CI/CD Pipeline

### Pre-commit Hooks

Husky pre-commit hooks ensure code quality:

```bash
# Automatically runs on git commit
- Lint-staged (format & lint staged files)
- Type checking
- Test execution
```

### GitHub Actions

#### CI Workflow (`.github/workflows/ci.yml`)
- Triggers: Pull requests and pushes to main/develop
- Steps: Install → Type Check → Lint → Test → Security Scan → Build

#### Deploy Workflow (`.github/workflows/deploy.yml`)
- Triggers: Push to main or manual dispatch
- Steps: Quality Checks → Deploy → Health Check → Notify

## 📊 API Endpoints

### Health & Info
- `GET /health` - Service health check
- `GET /mcp/info` - MCP protocol information
- `GET /` - API overview

### Authentication Service
- `POST /auth/validate` - Validate API key
- `GET /auth/status` - Authentication status
- `POST /auth/rate-limit` - Rate limit status
- `GET /auth/test-mexc` - Test MEXC credentials

### Market Data Service
- `POST /market-data/ticker` - Get ticker data
- `POST /market-data/order-book` - Get order book
- `POST /market-data/24h-stats` - Get 24h statistics
- `GET /market-data/test-connectivity` - Test connectivity
- `GET /market-data/test-auth` - Test authentication
- `POST /market-data/active-symbols` - Get active symbols
- `GET /market-data/health` - Market data service health
- `GET /market-data/mcp/tools` - Available MCP tools

### Trading Service
- `POST /trading/place-order` - Place a new order
- `POST /trading/cancel-order` - Cancel an existing order
- `POST /trading/order-status` - Get order status
- `GET /trading/open-orders` - Get open orders
- `POST /trading/order-history` - Get order history
- `POST /trading/trade-history` - Get trade history
- `GET /trading/health` - Trading service health

### Portfolio Service
- `GET /portfolio/balance` - Get account balance
- `GET /portfolio/positions` - Get open positions
- `POST /portfolio/pnl` - Get profit/loss data
- `GET /portfolio/health` - Portfolio service health

### Tools Service (MCP Protocol)
- `GET /tools/list` - List all available MCP tools
- `POST /tools/call` - Execute an MCP tool
- `GET /tools/resources` - List MCP resources
- `POST /tools/resources/read` - Read MCP resource content

## 🧩 Architecture

### Encore.ts Services

The application is built using a microservices architecture with 5 main services:

```
mexc-mcp-server/
├── encore.service.ts        # Main service definition
├── api.ts                   # Root API endpoints
├── auth/                    # Authentication service
│   ├── encore.service.ts    # Service definition
│   ├── api.ts              # Auth endpoints
│   └── auth.ts             # Auth logic
├── market-data/             # Market data service
│   ├── encore.service.ts    # Service definition
│   ├── api.ts              # Market data endpoints
│   ├── tools.ts            # MCP tools implementation
│   └── mexc-client.ts      # MEXC API client
├── trading/                 # Trading operations service
│   ├── encore.service.ts    # Service definition
│   ├── api.ts              # Trading endpoints
│   └── tools.ts            # Trading MCP tools
├── portfolio/               # Portfolio management service
│   ├── encore.service.ts    # Service definition
│   ├── api.ts              # Portfolio endpoints
│   └── tools.ts            # Portfolio MCP tools
└── tools/                   # MCP tools aggregation service
    ├── encore.service.ts    # Service definition
    └── api.ts              # MCP protocol endpoints
```

### Service Dependencies

- **auth**: Base authentication and rate limiting
- **market-data**: Real-time market data (depends on auth)
- **trading**: Order management (depends on auth, market-data)
- **portfolio**: Account and position tracking (depends on auth, trading)
- **tools**: MCP protocol implementation (aggregates all services)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following the coding standards
4. Run tests: `bun test`
5. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
6. Push to your branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Standards

- ✅ TypeScript with strict mode
- ✅ Test-driven development (TDD)
- ✅ Files under 500 lines
- ✅ Encore.ts interfaces for type safety
- ✅ Conventional commits
- ✅ 90%+ test coverage for new features
- ✅ Biome.js for linting and formatting

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](https://encore.dev/docs)
- 🐛 [Issues](https://github.com/RyanLisse/mexc-mcp-server/issues)
- 💬 [Discussions](https://github.com/RyanLisse/mexc-mcp-server/discussions)
- 📧 Email: ryan@ryanlisse.com
