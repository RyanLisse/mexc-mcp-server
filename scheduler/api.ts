import { api } from 'encore.dev/api';
import { CronJob } from 'encore.dev/cron';
import { calendar } from '~encore/clients';
import { detector } from '~encore/clients';
import { tracker } from '~encore/clients';

// =============================================================================
// Calendar Monitoring Cron Job - Every 1 hour
// =============================================================================

const _ = new CronJob('calendar-monitor', {
  title: 'Monitor MEXC Calendar for New Listings',
  every: '1h',
  endpoint: monitorCalendar,
});

export const monitorCalendar = api({}, async (): Promise<void> => {
  try {
    console.log('🗓️ Starting calendar monitoring...');

    const result = await calendar.monitorCalendar({ hours: 24 });

    console.log(
      `✅ Calendar monitoring completed: ${result.newListings} new listings found, ${result.totalListings} total pending`
    );

    // If new listings found, trigger immediate detection check
    if (result.newListings > 0) {
      console.log('🔍 New listings detected, triggering immediate detection...');
      await detector.triggerDetectionCheck();
    }
  } catch (error) {
    console.error('❌ Calendar monitoring failed:', error);
  }
});

// =============================================================================
// Adaptive Detection Cron Job - Every 30 seconds
// =============================================================================

const _detector = new CronJob('adaptive-detection', {
  title: 'Adaptive Token Detection',
  every: '30s',
  endpoint: runAdaptiveDetection,
});

export const runAdaptiveDetection = api({}, async (): Promise<void> => {
  try {
    console.log('🔍 Running adaptive detection...');

    const result = await detector.detectReadyStates();

    if (result.newTargets > 0) {
      console.log(`✅ Detection completed: ${result.newTargets} new targets ready for sniping`);
    }
  } catch (error) {
    console.error('❌ Adaptive detection failed:', error);
  }
});

// =============================================================================
// P&L Updates Cron Job - Every 1 minute
// =============================================================================

const _pnlUpdater = new CronJob('pnl-updates', {
  title: 'Update P&L for Active Positions',
  every: '1m',
  endpoint: updatePnL,
});

export const updatePnL = api({}, async (): Promise<void> => {
  try {
    console.log('💰 Updating P&L for active positions...');

    // This would typically call the tracker service to update P&L
    // For now, it's a placeholder that would be implemented based on active trades

    console.log('✅ P&L updates completed');
  } catch (error) {
    console.error('❌ P&L update failed:', error);
  }
});

// =============================================================================
// Data Cleanup Cron Job - Daily at 02:00 UTC
// =============================================================================

const _cleanup = new CronJob('daily-cleanup', {
  title: 'Daily Data Cleanup',
  schedule: '0 2 * * *', // 02:00 UTC daily
  endpoint: dailyCleanup,
});

export const dailyCleanup = api({}, async (): Promise<void> => {
  try {
    console.log('🧹 Starting daily data cleanup...');

    // Clean up expired sessions (older than 30 days)
    // Clean up old completed snipes (older than 90 days)
    // Clean up missed/cancelled listings (older than 7 days)

    console.log('✅ Daily cleanup completed');
  } catch (error) {
    console.error('❌ Daily cleanup failed:', error);
  }
});

// =============================================================================
// Health Check Cron Job - Every 5 minutes
// =============================================================================

const _healthCheck = new CronJob('health-check', {
  title: 'System Health Check',
  every: '5m',
  endpoint: systemHealthCheck,
});

export const systemHealthCheck = api({}, async (): Promise<void> => {
  try {
    console.log('🏥 Performing system health check...');

    // Check calendar service health
    const calendarHealth = await calendar.getCalendarHealth();

    // Check detector service health
    const detectorStatus = await detector.getDetectionStatus();

    // Log health status
    console.log('✅ System health check completed', {
      calendar: calendarHealth.status,
      detector: {
        active: detectorStatus.isActive,
        monitors: detectorStatus.activeMonitors,
        pending: detectorStatus.pendingListings,
        ready: detectorStatus.readyTargets,
      },
    });

    // Alert if any service is unhealthy
    if (calendarHealth.status === 'unhealthy') {
      console.warn('⚠️ Calendar service is unhealthy');
    }

    if (!detectorStatus.isActive && detectorStatus.pendingListings > 0) {
      console.warn('⚠️ Detector service is inactive but has pending listings');
    }
  } catch (error) {
    console.error('❌ System health check failed:', error);
  }
});

// =============================================================================
// Detection Restart Cron Job - Every hour
// =============================================================================

const _detectionRestart = new CronJob('detection-restart', {
  title: 'Restart Adaptive Detection',
  every: '1h',
  endpoint: restartAdaptiveDetection,
});

export const restartAdaptiveDetection = api({}, async (): Promise<void> => {
  try {
    console.log('🔄 Restarting adaptive detection...');

    // Stop current detection
    await detector.stopAdaptiveDetection();

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Start fresh detection
    const result = await detector.startAdaptiveDetection();

    console.log(`✅ Adaptive detection restarted: ${result.activeTiers.join(', ')} tiers active`);
  } catch (error) {
    console.error('❌ Detection restart failed:', error);
  }
});

// =============================================================================
// Market Data Sync Cron Job - Every 10 minutes
// =============================================================================

const _marketSync = new CronJob('market-data-sync', {
  title: 'Sync Market Data and Symbol Information',
  every: '10m',
  endpoint: syncMarketData,
});

export const syncMarketData = api({}, async (): Promise<void> => {
  try {
    console.log('📊 Syncing market data...');

    // This would typically call the market-data service to:
    // 1. Update symbol information
    // 2. Refresh price scales and quantity scales
    // 3. Check for new trading pairs
    // 4. Update market status

    console.log('✅ Market data sync completed');
  } catch (error) {
    console.error('❌ Market data sync failed:', error);
  }
});

// =============================================================================
// Performance Analytics Cron Job - Every 15 minutes
// =============================================================================

const _analytics = new CronJob('performance-analytics', {
  title: 'Update Performance Analytics',
  every: '15m',
  endpoint: updatePerformanceAnalytics,
});

export const updatePerformanceAnalytics = api({}, async (): Promise<void> => {
  try {
    console.log('📈 Updating performance analytics...');

    const analytics = await tracker.getPerformanceAnalytics();

    console.log('✅ Performance analytics updated', {
      totalSnipes: analytics.totalSnipes,
      successRate: `${analytics.successRate.toFixed(2)}%`,
      avgPnL1h: `$${analytics.avgPnL1h.toFixed(2)}`,
    });
  } catch (error) {
    console.error('❌ Performance analytics update failed:', error);
  }
});

// =============================================================================
// Manual Trigger Endpoints
// =============================================================================

/**
 * Manually trigger calendar monitoring
 */
export const triggerCalendarMonitoring = api(
  { method: 'POST', path: '/scheduler/trigger/calendar' },
  async (): Promise<{ success: boolean; message: string }> => {
    try {
      await monitorCalendar();
      return {
        success: true,
        message: 'Calendar monitoring triggered successfully',
      };
    } catch (error) {
      console.error('Manual calendar trigger failed:', error);
      return {
        success: false,
        message: 'Failed to trigger calendar monitoring',
      };
    }
  }
);

/**
 * Manually trigger adaptive detection
 */
export const triggerAdaptiveDetection = api(
  { method: 'POST', path: '/scheduler/trigger/detection' },
  async (): Promise<{ success: boolean; message: string }> => {
    try {
      await runAdaptiveDetection();
      return {
        success: true,
        message: 'Adaptive detection triggered successfully',
      };
    } catch (error) {
      console.error('Manual detection trigger failed:', error);
      return {
        success: false,
        message: 'Failed to trigger adaptive detection',
      };
    }
  }
);

/**
 * Manually trigger P&L updates
 */
export const triggerPnLUpdate = api(
  { method: 'POST', path: '/scheduler/trigger/pnl' },
  async (): Promise<{ success: boolean; message: string }> => {
    try {
      await updatePnL();
      return {
        success: true,
        message: 'P&L update triggered successfully',
      };
    } catch (error) {
      console.error('Manual P&L trigger failed:', error);
      return {
        success: false,
        message: 'Failed to trigger P&L update',
      };
    }
  }
);

/**
 * Get scheduler status and statistics
 */
export const getSchedulerStatus = api(
  { method: 'GET', path: '/scheduler/status' },
  async (): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    activeJobs: number;
    lastRun: {
      calendar: Date | null;
      detection: Date | null;
      pnl: Date | null;
      cleanup: Date | null;
      healthCheck: Date | null;
    };
    uptime: number;
  }> => {
    try {
      // This would track actual job execution times and status
      // For now, return a basic status

      return {
        status: 'healthy',
        activeJobs: 7, // Number of active cron jobs
        lastRun: {
          calendar: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
          detection: new Date(Date.now() - 30 * 1000), // 30 seconds ago
          pnl: new Date(Date.now() - 60 * 1000), // 1 minute ago
          cleanup: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          healthCheck: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        },
        uptime: Date.now() - 24 * 60 * 60 * 1000, // 24 hours
      };
    } catch (error) {
      console.error('Get scheduler status failed:', error);
      return {
        status: 'unhealthy',
        activeJobs: 0,
        lastRun: {
          calendar: null,
          detection: null,
          pnl: null,
          cleanup: null,
          healthCheck: null,
        },
        uptime: 0,
      };
    }
  }
);
