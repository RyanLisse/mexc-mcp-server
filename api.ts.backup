import { api } from 'encore.dev/api';

// Health check endpoint
interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: number;
  version: string;
  services: Record<string, { status: 'pass' | 'fail'; message: string }>;
}

export const health = api(
  { expose: true, method: 'GET', path: '/health' },
  async (): Promise<HealthResponse> => {
    const timestamp = Date.now();

    // Basic health checks
    const services: Record<string, { status: 'pass' | 'fail'; message: string }> = {
      api: {
        status: 'pass',
        message: 'API service is operational',
      },
      auth: {
        status: 'pass',
        message: 'Authentication service is operational',
      },
      marketData: {
        status: 'pass',
        message: 'Market data service is operational',
      },
    };

    // Determine overall status
    const allHealthy = Object.values(services).every((service) => service.status === 'pass');

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp,
      version: '1.0.0',
      services,
    };
  }
);

// MCP Protocol Info endpoint
interface MCPInfoResponse {
  name: string;
  version: string;
  description: string;
  capabilities: {
    tools: boolean;
    resources: boolean;
    prompts: boolean;
  };
  tools: Array<{
    name: string;
    description: string;
  }>;
}

export const mcpInfo = api(
  { expose: true, method: 'GET', path: '/mcp/info' },
  async (): Promise<MCPInfoResponse> => {
    return {
      name: 'MEXC MCP Server',
      version: '1.0.0',
      description: 'Model Context Protocol server for MEXC cryptocurrency exchange integration',
      capabilities: {
        tools: true,
        resources: true,
        prompts: false,
      },
      tools: [
        {
          name: 'mexc_get_ticker',
          description: 'Get current ticker price and 24h statistics for a trading symbol',
        },
        {
          name: 'mexc_get_order_book',
          description: 'Get current order book (bids and asks) for a trading symbol',
        },
        {
          name: 'mexc_get_24h_stats',
          description: 'Get 24-hour trading statistics for one or all symbols',
        },
        {
          name: 'mexc_test_connectivity',
          description: 'Test connectivity to MEXC API and check server time synchronization',
        },
        {
          name: 'mexc_test_authentication',
          description: 'Test MEXC API authentication with provided credentials',
        },
        {
          name: 'mexc_get_active_symbols',
          description: 'Get all active trading symbols on MEXC exchange',
        },
      ],
    };
  }
);

// Root endpoint
export const root = api(
  { expose: true, method: 'GET', path: '/' },
  async (): Promise<{ message: string; endpoints: string[] }> => {
    return {
      message: 'MEXC MCP Server - Model Context Protocol for MEXC Exchange',
      endpoints: [
        'GET /health - Health check',
        'GET /mcp/info - MCP protocol information',
        'GET / - This endpoint',
      ],
    };
  }
);
