/**
 * Pattern Sniper API Endpoints
 * Export all API endpoints from the service for proper Encore.ts integration
 */

export {
  getStatus,
  getTargets,
  startMonitoring,
  stopMonitoring,
  clearTargets,
  updateConfig,
  executeSnipe,
  getMetrics,
} from './service.js';
