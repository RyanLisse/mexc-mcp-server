import { api } from 'encore.dev/api';
import { db } from '../shared/database.js';
import {
  type ExecuteSnipeRequest,
  type ExecuteSnipeResponse,
  ExecutorError,
  type TradeExecutionResult,
} from '../shared/types/sniping-types.js';

/**
 * High-precision execution service for sniping trades
 */
export const executeSnipe = api(
  { method: 'POST', path: '/executor/snipe' },
  async (req: ExecuteSnipeRequest): Promise<ExecuteSnipeResponse> => {
    const { symbol, quantity, side = 'BUY', bufferMs = 500 } = req;

    try {
      // Validate input
      if (!symbol || !quantity || quantity <= 0) {
        throw new ExecutorError('Invalid snipe parameters');
      }

      // Get target info
      const target = await db.queryRow`
        SELECT * FROM targets WHERE symbol = ${symbol}
      `;

      if (!target) {
        throw new ExecutorError(`Target not found: ${symbol}`);
      }

      const launchTime = new Date(target.launch_time).getTime();
      const currentTime = Date.now();
      const timeUntilLaunch = launchTime - currentTime;

      console.log(`Executing snipe for ${symbol}: ${timeUntilLaunch}ms until launch`);

      // High-precision timing - Phase 1: Sleep until buffer time
      if (timeUntilLaunch > bufferMs) {
        const sleepDuration = timeUntilLaunch - bufferMs;
        console.log(`Sleeping for ${sleepDuration}ms until buffer time`);
        await sleep(sleepDuration);
      }

      // High-precision timing - Phase 2: Spin loop for precise timing
      const spinStartTime = performance.now();
      const targetExecutionTime = launchTime;

      console.log(`Starting precision spin loop for ${symbol}`);

      // Spin until exact launch time
      while (Date.now() < targetExecutionTime) {
        // Tight loop - exit when launch time reached
        const spinDuration = performance.now() - spinStartTime;
        if (spinDuration > 10000) {
          // 10s safety break
          console.warn(`Spin loop safety break triggered for ${symbol}`);
          break;
        }

        // Yield occasionally to prevent blocking
        if (spinDuration % 100 === 0) {
          await new Promise((resolve) => setImmediate(resolve));
        }
      }

      const executionStart = performance.now();

      try {
        // Execute the actual trade
        console.log(`Executing trade for ${symbol} at ${new Date().toISOString()}`);
        const result = await executeTrade(symbol, quantity, side);
        const executionTime = performance.now() - executionStart;

        console.log(`Trade executed for ${symbol} in ${executionTime}ms:`, result);

        // Log successful execution to database
        await db.exec`
          INSERT INTO snipes (
            target_symbol, exchange_order_id, status, side, 
            requested_qty, executed_qty, avg_price
          ) VALUES (
            ${symbol}, ${result.orderId}, 'EXECUTED', ${side},
            ${quantity}, ${result.executedQty}, ${result.avgPrice}
          )
        `;

        return {
          success: true,
          orderId: result.orderId,
          executionTime,
        };
      } catch (tradeError) {
        const executionTime = performance.now() - executionStart;

        console.error(`Trade execution failed for ${symbol}:`, tradeError);

        // Log failed attempt
        await db.exec`
          INSERT INTO snipes (target_symbol, status, side, requested_qty, notes)
          VALUES (${symbol}, 'FAILED', ${side}, ${quantity}, ${tradeError.message})
        `;

        return {
          success: false,
          error: tradeError.message,
          executionTime,
        };
      }
    } catch (error) {
      if (error instanceof ExecutorError) {
        throw error;
      }
      throw new ExecutorError(`Snipe execution failed: ${error.message}`);
    }
  }
);

/**
 * Get snipe execution queue status
 */
export const getExecutionQueue = api(
  { method: 'GET', path: '/executor/queue' },
  async (): Promise<{
    upcomingTargets: Array<{
      symbol: string;
      launchTime: Date;
      timeUntilLaunch: number;
      urgencyLevel: 'distant' | 'approaching' | 'imminent';
    }>;
  }> => {
    try {
      const targets = await db.query`
        SELECT symbol, launch_time
        FROM targets t
        JOIN listings l ON t.vcoin_id = l.vcoin_id
        WHERE l.status = 'READY'
        ORDER BY launch_time ASC
      `;

      const currentTime = Date.now();

      const upcomingTargets = targets.map((target) => {
        const launchTime = new Date(target.launch_time);
        const timeUntilLaunch = launchTime.getTime() - currentTime;

        let urgencyLevel: 'distant' | 'approaching' | 'imminent';
        if (timeUntilLaunch > 60 * 60 * 1000) {
          // > 1 hour
          urgencyLevel = 'distant';
        } else if (timeUntilLaunch > 10 * 60 * 1000) {
          // > 10 minutes
          urgencyLevel = 'approaching';
        } else {
          urgencyLevel = 'imminent';
        }

        return {
          symbol: target.symbol,
          launchTime,
          timeUntilLaunch,
          urgencyLevel,
        };
      });

      return { upcomingTargets };
    } catch (error) {
      throw new ExecutorError(`Failed to get execution queue: ${error.message}`);
    }
  }
);

/**
 * Test execution timing precision
 */
export const testExecutionTiming = api(
  { method: 'POST', path: '/executor/test-timing' },
  async (req: { delayMs: number }): Promise<{
    targetTime: number;
    actualExecutionTime: number;
    timingError: number;
    precision: string;
  }> => {
    try {
      const { delayMs } = req;
      const startTime = performance.now();
      const targetTime = startTime + delayMs;

      // Use same precision timing as actual snipe execution
      if (delayMs > 500) {
        await sleep(delayMs - 500);
      }

      // Spin loop for final precision
      while (performance.now() < targetTime) {
        // Tight timing loop
      }

      const actualExecutionTime = performance.now();
      const timingError = actualExecutionTime - targetTime;

      return {
        targetTime,
        actualExecutionTime,
        timingError,
        precision:
          Math.abs(timingError) < 1
            ? 'excellent'
            : Math.abs(timingError) < 5
              ? 'good'
              : Math.abs(timingError) < 10
                ? 'fair'
                : 'poor',
      };
    } catch (error) {
      throw new ExecutorError(`Timing test failed: ${error.message}`);
    }
  }
);

/**
 * Get execution statistics and performance metrics
 */
export const getExecutionStats = api(
  { method: 'GET', path: '/executor/stats' },
  async (): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    recentExecutions: Array<{
      symbol: string;
      status: string;
      executionTime?: number;
      timestamp: Date;
    }>;
  }> => {
    try {
      const stats = await db.queryRow`
        SELECT 
          COUNT(*) as total_executions,
          COUNT(CASE WHEN status = 'EXECUTED' THEN 1 END) as successful_executions,
          COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_executions
        FROM snipes
      `;

      const recentExecutions = await db.query`
        SELECT target_symbol, status, executed_at
        FROM snipes
        ORDER BY executed_at DESC
        LIMIT 10
      `;

      const successRate =
        stats.total_executions > 0
          ? (stats.successful_executions / stats.total_executions) * 100
          : 0;

      return {
        totalExecutions: stats.total_executions,
        successfulExecutions: stats.successful_executions,
        failedExecutions: stats.failed_executions,
        successRate,
        averageExecutionTime: 0, // Would need to track this in the database
        recentExecutions: recentExecutions.map((exec) => ({
          symbol: exec.target_symbol,
          status: exec.status,
          timestamp: new Date(exec.executed_at),
        })),
      };
    } catch (error) {
      throw new ExecutorError(`Failed to get execution stats: ${error.message}`);
    }
  }
);

/**
 * Execute a trade using MEXC API
 */
async function executeTrade(
  symbol: string,
  quantity: number,
  side: string
): Promise<TradeExecutionResult> {
  try {
    // TODO: Implement actual MEXC trading API call
    // This should use the existing MEXC client for authenticated trading

    console.log(`Executing ${side} order for ${quantity} ${symbol}`);

    // Placeholder implementation - replace with actual API call
    const mockResult: TradeExecutionResult = {
      orderId: `snipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      executedQty: quantity,
      avgPrice: Math.random() * 100, // Mock price
    };

    // Simulate some execution time
    await sleep(50 + Math.random() * 100);

    return mockResult;

    // Example of what the real implementation might look like:
    /*
    const mexcClient = new MEXCClient({
      apiKey: process.env.MEXC_API_KEY,
      secretKey: process.env.MEXC_SECRET_KEY,
    });
    
    const orderParams = {
      symbol,
      side: side as 'BUY' | 'SELL',
      type: 'MARKET' as const,
      quantity: quantity.toString(),
    };
    
    const result = await mexcClient.placeOrder(orderParams);
    
    return {
      orderId: result.orderId,
      executedQty: parseFloat(result.executedQty),
      avgPrice: parseFloat(result.avgPrice),
    };
    */
  } catch (error) {
    console.error(`Trade execution error for ${symbol}:`, error);
    throw new ExecutorError(`Trade execution failed: ${error.message}`);
  }
}

/**
 * Sleep utility with precise timing
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
