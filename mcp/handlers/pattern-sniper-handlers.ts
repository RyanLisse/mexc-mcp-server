/**
 * Pattern Sniper Integration Handlers
 * MCP endpoints that delegate to pattern sniper service
 */

import { api } from 'encore.dev/api';
import { createErrorResponse } from '../../shared/errors';

// Import pattern sniper service functions
import {
  clearTargets,
  executeSnipe,
  getStatus,
  getTargets,
  startMonitoring,
  stopMonitoring,
  updateConfig,
} from '../../pattern-sniper/service';

// Import proper types from pattern-sniper schemas
import type {
  CalendarEntry,
  PatternSniperConfig,
  PatternSniperStatus,
  SnipeTarget,
} from '../../pattern-sniper/schemas';

// Define response types for our endpoints
interface PatternSniperResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PatternSniperTargetsResponse {
  calendar: CalendarEntry[];
  pending: string[];
  ready: SnipeTarget[];
  executed: string[];
}

interface PatternSniperExecutionResponse {
  success: boolean;
  message: string;
  orderId?: string;
}

interface PatternSniperOperationResponse {
  success: boolean;
  message: string;
}

interface PatternSniperConfigResponse {
  success: boolean;
  config?: PatternSniperConfig;
  message?: string;
}

// Config update request interface
interface ConfigUpdateRequest {
  defaultOrderAmount?: number;
  maxPositionSize?: number;
  enableAutoExecution?: boolean;
  calendarRefreshInterval?: number;
  symbolsRefreshInterval?: number;
  testMode?: boolean;
}

// Execute snipe request interface
interface ExecuteSnipeRequest {
  symbol: string;
}

// =============================================================================
// Pattern Sniper MCP Integration Endpoints
// =============================================================================

/**
 * Pattern Sniper Status
 * Get current status of the pattern sniper service
 */
export const patternSniperStatus = api(
  { method: 'GET', path: '/mcp/pattern-sniper/status', expose: true },
  async (): Promise<PatternSniperResponse<PatternSniperStatus>> => {
    try {
      const status = await getStatus();
      return { success: true, data: status };
    } catch (error) {
      return {
        success: false,
        error: `Pattern sniper status failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

/**
 * Pattern Sniper Start
 * Start pattern sniper monitoring
 */
export const patternSniperStart = api(
  { method: 'POST', path: '/mcp/pattern-sniper/start', expose: true },
  async (): Promise<PatternSniperResponse<PatternSniperOperationResponse>> => {
    try {
      const result = await startMonitoring();
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: `Pattern sniper start failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

/**
 * Pattern Sniper Stop
 * Stop pattern sniper monitoring
 */
export const patternSniperStop = api(
  { method: 'POST', path: '/mcp/pattern-sniper/stop', expose: true },
  async (): Promise<PatternSniperResponse<PatternSniperOperationResponse>> => {
    try {
      const result = await stopMonitoring();
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: `Pattern sniper stop failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

/**
 * Pattern Sniper Targets
 * Get current monitoring targets
 */
export const patternSniperTargets = api(
  { method: 'GET', path: '/mcp/pattern-sniper/targets', expose: true },
  async (): Promise<PatternSniperResponse<PatternSniperTargetsResponse>> => {
    try {
      const targets = await getTargets();
      return { success: true, data: targets };
    } catch (error) {
      return {
        success: false,
        error: `Pattern sniper targets failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

/**
 * Pattern Sniper Config
 * Update pattern sniper configuration
 */
export const patternSniperConfig = api(
  { method: 'POST', path: '/mcp/pattern-sniper/config', expose: true },
  async (
    config: ConfigUpdateRequest
  ): Promise<PatternSniperResponse<PatternSniperConfigResponse>> => {
    try {
      const result = await updateConfig(config);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: `Pattern sniper config update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

/**
 * Pattern Sniper Execute
 * Execute a snipe operation
 */
export const patternSniperExecute = api(
  { method: 'POST', path: '/mcp/pattern-sniper/execute', expose: true },
  async (
    params: ExecuteSnipeRequest
  ): Promise<PatternSniperResponse<PatternSniperExecutionResponse>> => {
    try {
      const result = await executeSnipe(params);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: `Pattern sniper execute failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

/**
 * Pattern Sniper Clear
 * Clear all targets and reset
 */
export const patternSniperClear = api(
  { method: 'POST', path: '/mcp/pattern-sniper/clear', expose: true },
  async (): Promise<PatternSniperResponse<PatternSniperOperationResponse>> => {
    try {
      const result = await clearTargets();
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: `Pattern sniper clear failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);
