import { api } from 'encore.dev/api';
import { SQLDatabase } from 'encore.dev/storage/sqldb';
import {
  type PerformanceAnalyticsResponse,
  type StartPositionTrackingRequest,
  type StartPositionTrackingResponse,
  type TimeFrame,
  TrackerError,
  type UpdatePnLRequest,
  type UpdatePnLResponse,
} from '../shared/types/sniping-types.js';

// Database connection for sniping tables
const db = new SQLDatabase('sniping', {
  migrations: './shared/audit/migrations',
});

// Store active price monitoring sessions
const activePriceMonitors = new Map<number, NodeJS.Timeout[]>();

/**
 * Start tracking a position after successful snipe
 */
export const startPositionTracking = api(
  { method: 'POST', path: '/tracker/start' },
  async (req: StartPositionTrackingRequest): Promise<StartPositionTrackingResponse> => {
    try {
      const { snipeId } = req;

      const snipe = await db.queryRow`
        SELECT * FROM snipes WHERE id = ${snipeId} AND status = 'EXECUTED'
      `;

      if (!snipe) {
        throw new TrackerError('Executed snipe not found');
      }

      // Start WebSocket monitoring for the symbol
      await startPriceMonitoring(snipe.target_symbol, Number.parseFloat(snipe.avg_price), snipeId);

      return { message: `Started tracking position for ${snipe.target_symbol}` };
    } catch (error) {
      if (error instanceof TrackerError) {
        throw error;
      }
      throw new TrackerError(`Failed to start position tracking: ${error.message}`);
    }
  }
);

/**
 * Update P&L for a specific timeframe
 */
export const updatePnL = api(
  { method: 'POST', path: '/tracker/update-pnl' },
  async (req: UpdatePnLRequest): Promise<UpdatePnLResponse> => {
    try {
      const { snipeId, currentPrice, timeframe } = req;

      const snipe = await db.queryRow`
        SELECT * FROM snipes WHERE id = ${snipeId}
      `;

      if (!snipe) {
        throw new TrackerError('Snipe not found');
      }

      const entryPrice = Number.parseFloat(snipe.avg_price);
      const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

      const columnName = `pnl_${timeframe}`;

      // Update the specific P&L column
      await db.exec`
        UPDATE snipes 
        SET ${columnName} = ${pnlPercent}
        WHERE id = ${snipeId}
      `;

      console.log(`Updated ${timeframe} P&L for snipe ${snipeId}: ${pnlPercent.toFixed(2)}%`);

      return { pnl: pnlPercent };
    } catch (error) {
      if (error instanceof TrackerError) {
        throw error;
      }
      throw new TrackerError(`Failed to update P&L: ${error.message}`);
    }
  }
);

/**
 * Get performance analytics for all snipes
 */
export const getPerformanceAnalytics = api(
  { method: 'GET', path: '/tracker/analytics' },
  async (): Promise<PerformanceAnalyticsResponse> => {
    try {
      const analytics = await db.queryRow`
        SELECT 
          COUNT(*) as total_snipes,
          COUNT(CASE WHEN status = 'EXECUTED' THEN 1 END) as executed_snipes,
          AVG(pnl_1m) as avg_pnl_1m,
          AVG(pnl_5m) as avg_pnl_5m,
          AVG(pnl_15m) as avg_pnl_15m,
          AVG(pnl_1h) as avg_pnl_1h
        FROM snipes
      `;

      const bestPerformer = await db.queryRow`
        SELECT target_symbol, pnl_1h 
        FROM snipes 
        WHERE pnl_1h IS NOT NULL 
        ORDER BY pnl_1h DESC 
        LIMIT 1
      `;

      const worstPerformer = await db.queryRow`
        SELECT target_symbol, pnl_1h 
        FROM snipes 
        WHERE pnl_1h IS NOT NULL 
        ORDER BY pnl_1h ASC 
        LIMIT 1
      `;

      return {
        totalSnipes: analytics.total_snipes,
        successRate:
          analytics.total_snipes > 0
            ? (analytics.executed_snipes / analytics.total_snipes) * 100
            : 0,
        avgPnL1m: analytics.avg_pnl_1m || 0,
        avgPnL5m: analytics.avg_pnl_5m || 0,
        avgPnL15m: analytics.avg_pnl_15m || 0,
        avgPnL1h: analytics.avg_pnl_1h || 0,
        bestPerformer: bestPerformer
          ? {
              target_symbol: bestPerformer.target_symbol,
              pnl_1h: bestPerformer.pnl_1h,
            }
          : null,
        worstPerformer: worstPerformer
          ? {
              target_symbol: worstPerformer.target_symbol,
              pnl_1h: worstPerformer.pnl_1h,
            }
          : null,
      };
    } catch (error) {
      throw new TrackerError(`Failed to get performance analytics: ${error.message}`);
    }
  }
);

/**
 * Get detailed P&L history for a specific snipe
 */
export const getSnipePnLHistory = api(
  { method: 'GET', path: '/tracker/snipe/:id/pnl' },
  async (req: { id: string }): Promise<{
    snipeId: number;
    symbol: string;
    entryPrice: number;
    executedAt: Date;
    pnlHistory: {
      timeframe: TimeFrame;
      pnl: number | null;
    }[];
  }> => {
    try {
      const snipeId = Number.parseInt(req.id, 10);

      const snipe = await db.queryRow`
        SELECT * FROM snipes WHERE id = ${snipeId}
      `;

      if (!snipe) {
        throw new TrackerError(`Snipe not found: ${snipeId}`);
      }

      const pnlHistory = [
        { timeframe: '1m' as TimeFrame, pnl: snipe.pnl_1m },
        { timeframe: '5m' as TimeFrame, pnl: snipe.pnl_5m },
        { timeframe: '15m' as TimeFrame, pnl: snipe.pnl_15m },
        { timeframe: '1h' as TimeFrame, pnl: snipe.pnl_1h },
      ];

      return {
        snipeId,
        symbol: snipe.target_symbol,
        entryPrice: Number.parseFloat(snipe.avg_price),
        executedAt: new Date(snipe.executed_at),
        pnlHistory,
      };
    } catch (error) {
      if (error instanceof TrackerError) {
        throw error;
      }
      throw new TrackerError(`Failed to get snipe P&L history: ${error.message}`);
    }
  }
);

/**
 * Stop tracking a position
 */
export const stopPositionTracking = api(
  { method: 'POST', path: '/tracker/stop' },
  async (req: { snipeId: number }): Promise<{ message: string }> => {
    try {
      const { snipeId } = req;

      // Clear any active monitors for this snipe
      const monitors = activePriceMonitors.get(snipeId);
      if (monitors) {
        monitors.forEach((timeout) => clearTimeout(timeout));
        activePriceMonitors.delete(snipeId);
      }

      return { message: `Stopped tracking position for snipe ${snipeId}` };
    } catch (error) {
      throw new TrackerError(`Failed to stop position tracking: ${error.message}`);
    }
  }
);

/**
 * Get tracking status for all active positions
 */
export const getTrackingStatus = api(
  { method: 'GET', path: '/tracker/status' },
  async (): Promise<{
    activeTracking: number;
    trackedPositions: Array<{
      snipeId: number;
      symbol: string;
      entryPrice: number;
      latestPnL: number | null;
      trackingDuration: number;
    }>;
  }> => {
    try {
      const activeSnipes = await db.query`
        SELECT id, target_symbol, avg_price, executed_at, pnl_1h
        FROM snipes 
        WHERE status = 'EXECUTED'
        ORDER BY executed_at DESC
      `;

      const trackedPositions = activeSnipes.map((snipe) => ({
        snipeId: snipe.id,
        symbol: snipe.target_symbol,
        entryPrice: Number.parseFloat(snipe.avg_price),
        latestPnL: snipe.pnl_1h,
        trackingDuration: Date.now() - new Date(snipe.executed_at).getTime(),
      }));

      return {
        activeTracking: activePriceMonitors.size,
        trackedPositions,
      };
    } catch (error) {
      throw new TrackerError(`Failed to get tracking status: ${error.message}`);
    }
  }
);

/**
 * Start price monitoring for a symbol with P&L updates
 */
async function startPriceMonitoring(
  symbol: string,
  entryPrice: number,
  snipeId: number
): Promise<void> {
  try {
    console.log(`Starting price monitoring for ${symbol} (entry: $${entryPrice})`);

    // Clear any existing monitors for this snipe
    const existingMonitors = activePriceMonitors.get(snipeId);
    if (existingMonitors) {
      existingMonitors.forEach((timeout) => clearTimeout(timeout));
    }

    // Schedule P&L updates at specific intervals
    const monitors: NodeJS.Timeout[] = [
      setTimeout(() => updatePnLFromPrice(snipeId, '1m'), 60 * 1000), // 1 minute
      setTimeout(() => updatePnLFromPrice(snipeId, '5m'), 5 * 60 * 1000), // 5 minutes
      setTimeout(() => updatePnLFromPrice(snipeId, '15m'), 15 * 60 * 1000), // 15 minutes
      setTimeout(() => updatePnLFromPrice(snipeId, '1h'), 60 * 60 * 1000), // 1 hour
    ];

    activePriceMonitors.set(snipeId, monitors);

    // TODO: In a real implementation, this would also:
    // 1. Establish WebSocket connection to MEXC for real-time price updates
    // 2. Update P&L continuously based on live price feeds
    // 3. Handle connection failures and reconnection logic
    // 4. Implement price alerting based on P&L thresholds

    console.log(`Price monitoring started for ${symbol} with ${monitors.length} scheduled updates`);
  } catch (error) {
    console.error(`Failed to start price monitoring for ${symbol}:`, error);
    throw new TrackerError(`Failed to start price monitoring: ${error.message}`);
  }
}

/**
 * Update P&L based on current market price
 */
async function updatePnLFromPrice(snipeId: number, timeframe: TimeFrame): Promise<void> {
  try {
    // Get the snipe details
    const snipe = await db.queryRow`
      SELECT target_symbol, avg_price FROM snipes WHERE id = ${snipeId}
    `;

    if (!snipe) {
      console.error(`Snipe not found for P&L update: ${snipeId}`);
      return;
    }

    // Get current price from market data
    const currentPrice = await getCurrentPrice(snipe.target_symbol);

    if (currentPrice) {
      // Update P&L in database
      await updatePnL({
        snipeId,
        currentPrice,
        timeframe,
      });

      console.log(`Updated ${timeframe} P&L for ${snipe.target_symbol} (snipe ${snipeId})`);
    }
  } catch (error) {
    console.error(`Failed to update P&L from price for snipe ${snipeId}:`, error);
  }
}

/**
 * Get current market price for a symbol
 */
async function getCurrentPrice(symbol: string): Promise<number | null> {
  try {
    // TODO: Implement actual price fetching from MEXC API or WebSocket
    // This should integrate with the existing market-data service

    console.log(`Fetching current price for ${symbol}`);

    // Placeholder implementation - replace with actual price fetching
    // In a real implementation, this would:
    // 1. Call the market-data service getTicker endpoint
    // 2. Use WebSocket price feeds if available
    // 3. Handle rate limiting and caching appropriately

    return Math.random() * 100; // Mock price for testing

    // Example of what the real implementation might look like:
    /*
    const response = await fetch(`/market-data/ticker?symbol=${symbol}`);
    const data = await response.json();
    
    if (data.success && data.data) {
      return parseFloat(data.data.price);
    }
    
    return null;
    */
  } catch (error) {
    console.error(`Error fetching current price for ${symbol}:`, error);
    return null;
  }
}
