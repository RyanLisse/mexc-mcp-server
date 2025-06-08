import { api } from 'encore.dev/api';
import { db } from '../shared/database.js';
import {
  CalendarError,
  type CalendarListing,
  type GetPendingListingsResponse,
  type Listing,
  type MonitorCalendarRequest,
  type MonitorCalendarResponse,
} from '../shared/types/sniping-types.js';

/**
 * Monitors the MEXC calendar for new listings and persists them to database
 */
export const monitorCalendar = api(
  { method: 'POST', path: '/calendar/monitor' },
  async (req: MonitorCalendarRequest): Promise<MonitorCalendarResponse> => {
    try {
      const { hours = 24 } = req;

      // Validate input
      if (hours < 1 || hours > 168) {
        throw new CalendarError('Hours must be between 1 and 168 (1 week)');
      }

      // Fetch calendar data from MEXC API
      const calendarData = await fetchMexcCalendar(hours);

      let newListings = 0;

      for (const listing of calendarData) {
        try {
          const result = await db.exec`
            INSERT INTO listings (vcoin_id, symbol, project_name, scheduled_launch_time)
            VALUES (${listing.vcoin_id}, ${listing.symbol}, ${listing.project_name || null}, ${listing.scheduled_launch_time})
            ON CONFLICT (vcoin_id) DO NOTHING
            RETURNING vcoin_id
          `;

          if (result.rowCount > 0) {
            newListings++;
          }
        } catch (error) {
          console.error(`Failed to insert listing ${listing.symbol}:`, error);
          // Continue with other listings
        }
      }

      const totalResult = await db.queryRow`
        SELECT COUNT(*) as total FROM listings WHERE status = 'PENDING'
      `;

      return {
        newListings,
        totalListings: totalResult.total,
      };
    } catch (error) {
      if (error instanceof CalendarError) {
        throw error;
      }
      throw new CalendarError(`Failed to monitor calendar: ${error.message}`);
    }
  }
);

/**
 * Get all pending listings from database
 */
export const getPendingListings = api(
  { method: 'GET', path: '/calendar/pending' },
  async (): Promise<GetPendingListingsResponse> => {
    try {
      const rows = await db.query`
        SELECT vcoin_id, symbol, project_name, scheduled_launch_time, discovered_at, status
        FROM listings 
        WHERE status = 'PENDING'
        ORDER BY scheduled_launch_time ASC
      `;

      const listings: Listing[] = rows.map((row) => ({
        vcoinId: row.vcoin_id,
        symbol: row.symbol,
        projectName: row.project_name,
        scheduledLaunchTime: new Date(row.scheduled_launch_time),
        discoveredAt: new Date(row.discovered_at),
        status: row.status,
      }));

      return { listings };
    } catch (error) {
      throw new CalendarError(`Failed to get pending listings: ${error.message}`);
    }
  }
);

/**
 * Get upcoming listings within a specific timeframe
 */
export const getUpcomingListings = api(
  { method: 'POST', path: '/calendar/upcoming' },
  async (req: { hoursAhead: number }): Promise<GetPendingListingsResponse> => {
    try {
      const { hoursAhead } = req;

      if (hoursAhead < 0 || hoursAhead > 168) {
        throw new CalendarError('Hours ahead must be between 0 and 168');
      }

      const cutoffTime = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);

      const rows = await db.query`
        SELECT vcoin_id, symbol, project_name, scheduled_launch_time, discovered_at, status
        FROM listings 
        WHERE status = 'PENDING' 
          AND scheduled_launch_time <= ${cutoffTime.toISOString()}
        ORDER BY scheduled_launch_time ASC
      `;

      const listings: Listing[] = rows.map((row) => ({
        vcoinId: row.vcoin_id,
        symbol: row.symbol,
        projectName: row.project_name,
        scheduledLaunchTime: new Date(row.scheduled_launch_time),
        discoveredAt: new Date(row.discovered_at),
        status: row.status,
      }));

      return { listings };
    } catch (error) {
      if (error instanceof CalendarError) {
        throw error;
      }
      throw new CalendarError(`Failed to get upcoming listings: ${error.message}`);
    }
  }
);

/**
 * Update the status of a listing
 */
export const updateListingStatus = api(
  { method: 'POST', path: '/calendar/update-status' },
  async (req: { vcoinId: string; status: string }): Promise<{ success: boolean }> => {
    try {
      const { vcoinId, status } = req;

      // Validate status
      const validStatuses = ['PENDING', 'READY', 'SNIPED', 'MISSED'];
      if (!validStatuses.includes(status)) {
        throw new CalendarError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const result = await db.exec`
        UPDATE listings 
        SET status = ${status}
        WHERE vcoin_id = ${vcoinId}
      `;

      if (result.rowCount === 0) {
        throw new CalendarError(`Listing not found: ${vcoinId}`);
      }

      return { success: true };
    } catch (error) {
      if (error instanceof CalendarError) {
        throw error;
      }
      throw new CalendarError(`Failed to update listing status: ${error.message}`);
    }
  }
);

/**
 * Get calendar service health and statistics
 */
export const getCalendarHealth = api(
  { method: 'GET', path: '/calendar/health' },
  async (): Promise<{
    status: 'healthy' | 'unhealthy';
    stats: {
      totalListings: number;
      pendingListings: number;
      readyListings: number;
      snipedListings: number;
      missedListings: number;
    };
    lastUpdate: Date;
  }> => {
    try {
      const stats = await db.queryRow`
        SELECT 
          COUNT(*) as total_listings,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_listings,
          COUNT(CASE WHEN status = 'READY' THEN 1 END) as ready_listings,
          COUNT(CASE WHEN status = 'SNIPED' THEN 1 END) as sniped_listings,
          COUNT(CASE WHEN status = 'MISSED' THEN 1 END) as missed_listings,
          MAX(discovered_at) as last_update
        FROM listings
      `;

      return {
        status: 'healthy',
        stats: {
          totalListings: stats.total_listings,
          pendingListings: stats.pending_listings,
          readyListings: stats.ready_listings,
          snipedListings: stats.sniped_listings,
          missedListings: stats.missed_listings,
        },
        lastUpdate: stats.last_update ? new Date(stats.last_update) : new Date(),
      };
    } catch (_error) {
      return {
        status: 'unhealthy',
        stats: {
          totalListings: 0,
          pendingListings: 0,
          readyListings: 0,
          snipedListings: 0,
          missedListings: 0,
        },
        lastUpdate: new Date(),
      };
    }
  }
);

/**
 * Fetch calendar data from MEXC API
 * This is a placeholder - needs to be implemented with actual MEXC calendar API
 */
async function fetchMexcCalendar(hours: number): Promise<CalendarListing[]> {
  try {
    // TODO: Implement actual MEXC calendar API call
    // For now, return empty array as placeholder

    // The actual implementation would:
    // 1. Call MEXC calendar endpoint
    // 2. Filter by upcoming launches within 'hours' timeframe
    // 3. Transform the response to CalendarListing format

    console.log(`Fetching MEXC calendar for next ${hours} hours...`);

    // Placeholder return - replace with actual API call
    return [];

    // Example of what the real implementation might look like:
    /*
    const response = await fetch('https://api.mexc.com/api/v3/calendar', {
      method: 'GET',
      headers: {
        'X-MEXC-APIKEY': process.env.MEXC_API_KEY,
      },
    });
    
    if (!response.ok) {
      throw new Error(`MEXC calendar API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.listings
      .filter(listing => {
        const launchTime = new Date(listing.launch_time);
        const cutoff = new Date(Date.now() + (hours * 60 * 60 * 1000));
        return launchTime <= cutoff;
      })
      .map(listing => ({
        vcoin_id: listing.id,
        symbol: listing.symbol,
        project_name: listing.name,
        scheduled_launch_time: listing.launch_time,
      }));
    */
  } catch (error) {
    console.error('Error fetching MEXC calendar:', error);
    throw new CalendarError(`Failed to fetch MEXC calendar: ${error.message}`);
  }
}
