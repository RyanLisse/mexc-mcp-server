import type { MCPTool, MCPToolResult, ToolHandler } from '../tools/types';
import { portfolioService } from './encore.service';
import { validatePortfolioArgs } from './schemas';
import { PORTFOLIO_TOOLS, PortfolioToolSchemas } from './schemas';
import type {
  GetBalanceHistoryArgs,
  GetBalancesArgs,
  GetPortfolioSummaryArgs,
  GetPositionsArgs,
  GetRiskMetricsArgs,
  GetTransactionHistoryArgs,
} from './types';

/**
 * Get account balances MCP tool
 */
export const getBalancesTool: ToolHandler = {
  name: PORTFOLIO_TOOLS.GET_BALANCES,
  description: 'Get current account balances for all assets or specific assets with USD values',
  inputSchema: PortfolioToolSchemas.mexc_get_balances,

  async execute(args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      const validatedArgs = validatePortfolioArgs(
        PORTFOLIO_TOOLS.GET_BALANCES,
        args
      ) as GetBalancesArgs;
      const balances = await portfolioService.getBalances(validatedArgs);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                balances,
                totalAssets: balances.length,
                totalValue: balances.reduce((sum, b) => sum + Number(b.usdValue), 0).toFixed(2),
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              tool: PORTFOLIO_TOOLS.GET_BALANCES,
            }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Get portfolio positions MCP tool
 */
export const getPositionsTool: ToolHandler = {
  name: PORTFOLIO_TOOLS.GET_POSITIONS,
  description: 'Get current portfolio positions with P&L calculations and market values',
  inputSchema: PortfolioToolSchemas.mexc_get_positions,

  async execute(args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      const validatedArgs = validatePortfolioArgs(
        PORTFOLIO_TOOLS.GET_POSITIONS,
        args
      ) as GetPositionsArgs;
      const positions = await portfolioService.getPositions(validatedArgs);

      const totalMarketValue = positions.reduce((sum, p) => sum + Number(p.marketValue), 0);
      const totalPnl = positions.reduce((sum, p) => sum + Number(p.unrealizedPnl), 0);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                positions,
                summary: {
                  totalPositions: positions.length,
                  totalMarketValue: totalMarketValue.toFixed(2),
                  totalUnrealizedPnl: totalPnl.toFixed(2),
                  totalPnlPercent:
                    totalMarketValue > 0
                      ? ((totalPnl / totalMarketValue) * 100).toFixed(2)
                      : '0.00',
                },
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              tool: PORTFOLIO_TOOLS.GET_POSITIONS,
            }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Get transaction history MCP tool
 */
export const getTransactionHistoryTool: ToolHandler = {
  name: PORTFOLIO_TOOLS.GET_TRANSACTION_HISTORY,
  description: 'Get transaction history with filtering, pagination, and sorting options',
  inputSchema: PortfolioToolSchemas.mexc_get_transaction_history,

  async execute(args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      const validatedArgs = validatePortfolioArgs(
        PORTFOLIO_TOOLS.GET_TRANSACTION_HISTORY,
        args
      ) as GetTransactionHistoryArgs;
      const result = await portfolioService.getTransactionHistory(validatedArgs);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              tool: PORTFOLIO_TOOLS.GET_TRANSACTION_HISTORY,
            }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Get portfolio summary MCP tool
 */
export const getPortfolioSummaryTool: ToolHandler = {
  name: PORTFOLIO_TOOLS.GET_PORTFOLIO_SUMMARY,
  description: 'Get comprehensive portfolio overview with total value, P&L, and top holdings',
  inputSchema: PortfolioToolSchemas.mexc_get_portfolio_summary,

  async execute(args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      const validatedArgs = validatePortfolioArgs(
        PORTFOLIO_TOOLS.GET_PORTFOLIO_SUMMARY,
        args
      ) as GetPortfolioSummaryArgs;
      const summary = await portfolioService.getPortfolioSummary(validatedArgs);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              tool: PORTFOLIO_TOOLS.GET_PORTFOLIO_SUMMARY,
            }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Get balance history MCP tool
 */
export const getBalanceHistoryTool: ToolHandler = {
  name: PORTFOLIO_TOOLS.GET_BALANCE_HISTORY,
  description: 'Get portfolio balance history over time with change tracking',
  inputSchema: PortfolioToolSchemas.mexc_get_balance_history,

  async execute(args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      const validatedArgs = validatePortfolioArgs(
        PORTFOLIO_TOOLS.GET_BALANCE_HISTORY,
        args
      ) as GetBalanceHistoryArgs;
      const history = await portfolioService.getBalanceHistory(
        validatedArgs.period,
        validatedArgs.limit
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(history, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              tool: PORTFOLIO_TOOLS.GET_BALANCE_HISTORY,
            }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Get portfolio metrics MCP tool
 */
export const getPortfolioMetricsTool: ToolHandler = {
  name: PORTFOLIO_TOOLS.GET_PORTFOLIO_METRICS,
  description: 'Get comprehensive portfolio performance metrics and statistics',
  inputSchema: PortfolioToolSchemas.mexc_get_portfolio_metrics,

  async execute(args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      const metrics = await portfolioService.getPortfolioMetrics();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(metrics, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              tool: PORTFOLIO_TOOLS.GET_PORTFOLIO_METRICS,
            }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Get risk metrics MCP tool
 */
export const getRiskMetricsTool: ToolHandler = {
  name: PORTFOLIO_TOOLS.GET_RISK_METRICS,
  description: 'Get portfolio risk analysis including VaR, volatility, and correlation metrics',
  inputSchema: PortfolioToolSchemas.mexc_get_risk_metrics,

  async execute(args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      const validatedArgs = validatePortfolioArgs(
        PORTFOLIO_TOOLS.GET_RISK_METRICS,
        args
      ) as GetRiskMetricsArgs;
      const riskMetrics = await portfolioService.getRiskMetrics(validatedArgs);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(riskMetrics, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              tool: PORTFOLIO_TOOLS.GET_RISK_METRICS,
            }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Get position metrics MCP tool
 */
export const getPositionMetricsTool: ToolHandler = {
  name: PORTFOLIO_TOOLS.GET_POSITION_METRICS,
  description: 'Get position-level metrics including allocation and performance analysis',
  inputSchema: PortfolioToolSchemas.mexc_get_position_metrics,

  async execute(args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      const metrics = await portfolioService.getPositionMetrics();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(metrics, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              tool: PORTFOLIO_TOOLS.GET_POSITION_METRICS,
            }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Refresh portfolio data MCP tool
 */
export const refreshPortfolioTool: ToolHandler = {
  name: PORTFOLIO_TOOLS.REFRESH_PORTFOLIO,
  description: 'Refresh portfolio data from exchange APIs',
  inputSchema: PortfolioToolSchemas.mexc_refresh_portfolio,

  async execute(args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      const { components = ['all'] } = args as { components?: string[] };
      const result = await portfolioService.refreshPortfolio(components);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: result.success,
                refreshed: result.refreshed,
                timestamp: new Date().toISOString(),
                message: `Successfully refreshed: ${result.refreshed.join(', ')}`,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              tool: PORTFOLIO_TOOLS.REFRESH_PORTFOLIO,
            }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Get asset balance MCP tool
 */
export const getAssetBalanceTool: ToolHandler = {
  name: PORTFOLIO_TOOLS.GET_ASSET_BALANCE,
  description: 'Get balance information for a specific asset',
  inputSchema: PortfolioToolSchemas.mexc_get_asset_balance,

  async execute(args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      const { asset, refresh = false } = args as { asset: string; refresh?: boolean };

      if (!asset) {
        throw new Error('Asset parameter is required');
      }

      const balance = await portfolioService.getAssetBalance(asset, refresh);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                asset: asset.toUpperCase(),
                balance,
                found: balance !== null,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              tool: PORTFOLIO_TOOLS.GET_ASSET_BALANCE,
            }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Get position by symbol MCP tool
 */
export const getPositionTool: ToolHandler = {
  name: PORTFOLIO_TOOLS.GET_POSITION,
  description: 'Get position details for a specific trading pair',
  inputSchema: PortfolioToolSchemas.mexc_get_position,

  async execute(args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      const { symbol, refresh = false } = args as { symbol: string; refresh?: boolean };

      if (!symbol) {
        throw new Error('Symbol parameter is required');
      }

      const position = await portfolioService.getPosition(symbol, refresh);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                symbol: symbol.toUpperCase(),
                position,
                found: position !== null,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              tool: PORTFOLIO_TOOLS.GET_POSITION,
            }),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * All portfolio MCP tools
 */
export const portfolioTools: ToolHandler[] = [
  getBalancesTool,
  getPositionsTool,
  getTransactionHistoryTool,
  getPortfolioSummaryTool,
  getBalanceHistoryTool,
  getPortfolioMetricsTool,
  getRiskMetricsTool,
  getPositionMetricsTool,
  refreshPortfolioTool,
  getAssetBalanceTool,
  getPositionTool,
];

/**
 * Get all portfolio tools as MCP tool definitions
 */
export function getPortfolioMCPTools(): MCPTool[] {
  return portfolioTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
}

/**
 * Find portfolio tool by name
 */
export function findPortfolioTool(name: string): ToolHandler | undefined {
  return portfolioTools.find((tool) => tool.name === name);
}

/**
 * Validate if a tool name is a portfolio tool
 */
export function isPortfolioTool(name: string): boolean {
  return Object.values(PORTFOLIO_TOOLS).includes(name as any);
}

/**
 * Get portfolio tool names
 */
export function getPortfolioToolNames(): string[] {
  return portfolioTools.map((tool) => tool.name);
}

/**
 * Portfolio tool execution helper
 */
export async function executePortfolioTool(
  name: string,
  args: Record<string, unknown>
): Promise<MCPToolResult> {
  const tool = findPortfolioTool(name);

  if (!tool) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: `Portfolio tool '${name}' not found`,
            availableTools: getPortfolioToolNames(),
          }),
        },
      ],
      isError: true,
    };
  }

  return tool.execute(args, {
    timestamp: new Date(),
    userId: undefined,
    sessionId: undefined,
  });
}
