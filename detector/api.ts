import { api } from 'encore.dev/api';
import { db } from '../shared/database.js';
import {
  DEFAULT_POLLING_TIERS,
  type DetectReadyStatesResponse,
  DetectorError,
  type MarketSymbolInfo,
  type PollingTier,
  type StartAdaptiveDetectionResponse,
} from '../shared/types/sniping-types.js';

// Define polling tiers for adaptive monitoring
const POLLING_TIERS: PollingTier[] = DEFAULT_POLLING_TIERS;

// Store active monitoring intervals
const activeMonitors = new Map<string, NodeJS.Timeout>();

/**
 * Adaptive detector that monitors based on urgency
 */
export const startAdaptiveDetection = api(
  { method: 'POST', path: '/detector/start' },
  async (): Promise<StartAdaptiveDetectionResponse> => {
    try {
      const pendingListings = await db.query`
        SELECT vcoin_id, symbol, scheduled_launch_time
        FROM listings 
        WHERE status = 'PENDING'
      `;

      const activeTiers: string[] = [];

      // Group listings by polling tier
      const tierGroups = new Map<
        string,
        Array<{ vcoin_id: string; symbol: string; scheduled_launch_time: string }>
      >();

      for (const listing of pendingListings) {
        const timeUntilLaunch = new Date(listing.scheduled_launch_time).getTime() - Date.now();
        const tier = POLLING_TIERS.find(
          (t) => timeUntilLaunch >= t.minTimeUntilLaunch && timeUntilLaunch < t.maxTimeUntilLaunch
        );

        if (tier) {
          if (!tierGroups.has(tier.name)) {
            tierGroups.set(tier.name, []);
          }
          tierGroups.get(tier.name)?.push(listing);

          if (!activeTiers.includes(tier.name)) {
            activeTiers.push(tier.name);
          }
        }
      }

      // Start monitoring for each tier
      for (const [tierName, listings] of tierGroups) {
        const tier = POLLING_TIERS.find((t) => t.name === tierName);
        if (tier) {
          await startTierMonitoring(tier, listings);
        }
      }

      return {
        message: `Started adaptive detection for ${pendingListings.length} listings`,
        activeTiers,
      };
    } catch (error) {
      throw new DetectorError(`Failed to start adaptive detection: ${error.message}`);
    }
  }
);

/**
 * Check for ready states and move to targets table
 */
export const detectReadyStates = api(
  { method: 'POST', path: '/detector/check-ready' },
  async (): Promise<DetectReadyStatesResponse> => {
    try {
      const pendingListings = await db.query`
        SELECT vcoin_id, symbol, project_name, scheduled_launch_time
        FROM listings 
        WHERE status = 'PENDING'
      `;

      let newTargets = 0;

      // Get current symbols from MEXC
      const mexcSymbols = await fetchMexcSymbols();

      for (const listing of pendingListings) {
        const isReady = await checkIfTokenReady(listing.symbol, mexcSymbols);

        if (isReady) {
          const symbolInfo = mexcSymbols.find((s) => s.symbol === listing.symbol);
          if (symbolInfo) {
            try {
              // Insert into targets table
              await db.exec`
                INSERT INTO targets (
                  symbol, vcoin_id, project_name, launch_time, 
                  price_scale, quantity_scale, hours_advance_notice, pattern
                ) VALUES (
                  ${listing.symbol}, ${listing.vcoin_id}, ${listing.project_name || ''}, 
                  ${listing.scheduled_launch_time}, ${symbolInfo.priceScale}, 
                  ${symbolInfo.quantityScale}, ${calculateAdvanceNotice(listing.scheduled_launch_time)}, 
                  ${generatePattern(symbolInfo)}
                )
                ON CONFLICT (symbol) DO NOTHING
              `;

              // Update listing status
              await db.exec`
                UPDATE listings SET status = 'READY' WHERE vcoin_id = ${listing.vcoin_id}
              `;

              newTargets++;
              console.log(`Token ${listing.symbol} is now ready for sniping`);
            } catch (error) {
              console.error(`Failed to create target for ${listing.symbol}:`, error);
            }
          }
        }
      }

      return { newTargets };
    } catch (error) {
      throw new DetectorError(`Failed to detect ready states: ${error.message}`);
    }
  }
);

/**
 * Stop adaptive detection
 */
export const stopAdaptiveDetection = api(
  { method: 'POST', path: '/detector/stop' },
  async (): Promise<{ message: string; stoppedMonitors: number }> => {
    try {
      let stoppedCount = 0;

      // Clear all active monitors
      for (const [key, interval] of activeMonitors) {
        clearInterval(interval);
        activeMonitors.delete(key);
        stoppedCount++;
      }

      return {
        message: 'Stopped adaptive detection',
        stoppedMonitors: stoppedCount,
      };
    } catch (error) {
      throw new DetectorError(`Failed to stop adaptive detection: ${error.message}`);
    }
  }
);

/**
 * Get detection status and statistics
 */
export const getDetectionStatus = api(
  { method: 'GET', path: '/detector/status' },
  async (): Promise<{
    isActive: boolean;
    activeMonitors: number;
    pendingListings: number;
    readyTargets: number;
    pollingTiers: PollingTier[];
  }> => {
    try {
      const pendingCount = await db.queryRow`
        SELECT COUNT(*) as count FROM listings WHERE status = 'PENDING'
      `;

      const readyCount = await db.queryRow`
        SELECT COUNT(*) as count FROM targets
      `;

      return {
        isActive: activeMonitors.size > 0,
        activeMonitors: activeMonitors.size,
        pendingListings: pendingCount.count,
        readyTargets: readyCount.count,
        pollingTiers: POLLING_TIERS,
      };
    } catch (error) {
      throw new DetectorError(`Failed to get detection status: ${error.message}`);
    }
  }
);

/**
 * Manually trigger a detection check
 */
export const triggerDetectionCheck = api(
  { method: 'POST', path: '/detector/trigger-check' },
  async (): Promise<DetectReadyStatesResponse> => {
    try {
      return await detectReadyStates();
    } catch (error) {
      throw new DetectorError(`Failed to trigger detection check: ${error.message}`);
    }
  }
);

/**
 * Start tier-specific monitoring
 */
async function startTierMonitoring(
  tier: PollingTier,
  listings: Array<{ vcoin_id: string; symbol: string; scheduled_launch_time: string }>
): Promise<void> {
  try {
    const monitorKey = `${tier.name}_${Date.now()}`;

    // Clear existing monitor for this tier if it exists
    const existingKey = Array.from(activeMonitors.keys()).find((key) => key.startsWith(tier.name));
    if (existingKey) {
      const intervalId = activeMonitors.get(existingKey);
      if (intervalId) {
        clearInterval(intervalId);
      }
      activeMonitors.delete(existingKey);
    }

    // Start new monitoring interval
    const interval = setInterval(async () => {
      try {
        await detectReadyStates();

        // Check if we should continue monitoring for this tier
        const currentTime = Date.now();
        const stillRelevant = listings.some((listing) => {
          const timeUntilLaunch = new Date(listing.scheduled_launch_time).getTime() - currentTime;
          return (
            timeUntilLaunch >= tier.minTimeUntilLaunch && timeUntilLaunch < tier.maxTimeUntilLaunch
          );
        });

        if (!stillRelevant) {
          clearInterval(interval);
          activeMonitors.delete(monitorKey);
          console.log(`Stopped monitoring tier ${tier.name} - no longer relevant`);
        }
      } catch (error) {
        console.error(`Error in tier ${tier.name} monitoring:`, error);
      }
    }, tier.intervalMs);

    activeMonitors.set(monitorKey, interval);
    console.log(
      `Started monitoring tier ${tier.name} with ${listings.length} listings at ${tier.intervalMs}ms intervals`
    );
  } catch (error) {
    console.error(`Failed to start tier monitoring for ${tier.name}:`, error);
  }
}

/**
 * Fetch current symbols from MEXC API
 */
async function fetchMexcSymbols(): Promise<MarketSymbolInfo[]> {
  try {
    // TODO: Implement actual MEXC symbols API call
    // This should call the MEXC symbolsV2 endpoint to get all active symbols

    console.log('Fetching MEXC symbols...');

    // Placeholder implementation - replace with actual API call
    return [];

    // Example of what the real implementation might look like:
    /*
    const response = await fetch('https://api.mexc.com/api/v3/exchangeInfo', {
      method: 'GET',
      headers: {
        'X-MEXC-APIKEY': process.env.MEXC_API_KEY,
      },
    });
    
    if (!response.ok) {
      throw new Error(`MEXC symbols API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.symbols.map(symbol => ({
      symbol: symbol.symbol,
      priceScale: symbol.quotePrecision,
      quantityScale: symbol.baseAssetPrecision,
      isActive: symbol.status === 'TRADING',
      lastUpdate: new Date(),
    }));
    */
  } catch (error) {
    console.error('Error fetching MEXC symbols:', error);
    throw new DetectorError(`Failed to fetch MEXC symbols: ${error.message}`);
  }
}

/**
 * Check if a token is ready for trading
 */
async function checkIfTokenReady(
  symbol: string,
  mexcSymbols: MarketSymbolInfo[]
): Promise<boolean> {
  try {
    // Check if symbol appears in MEXC active symbols
    const isListed = mexcSymbols.some((s) => s.symbol === symbol && s.isActive);

    if (isListed) {
      console.log(`Token ${symbol} detected as ready for trading`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error checking if token ${symbol} is ready:`, error);
    return false;
  }
}

/**
 * Calculate hours of advance notice
 */
function calculateAdvanceNotice(launchTime: string): number {
  const now = Date.now();
  const launch = new Date(launchTime).getTime();
  return (now - launch) / (1000 * 60 * 60); // Convert to hours
}

/**
 * Generate pattern string for symbol info
 */
function generatePattern(symbolInfo: MarketSymbolInfo): string {
  return `sts:${symbolInfo.priceScale},st:${symbolInfo.priceScale},tt:${symbolInfo.quantityScale}`;
}
