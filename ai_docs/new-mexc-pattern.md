// schemas.ts
import { z } from 'zod';

// Zod Schemas
export const CalendarEntrySchema = z.object({
  vcoinId: z.string(),
  symbol: z.string(),
  projectName: z.string(),
  firstOpenTime: z.number(),
});

export const SymbolV2EntrySchema = z.object({
  cd: z.string(), // vcoinId
  ca: z.string().optional(), // contract address
  ps: z.number().optional(), // price scale
  qs: z.number().optional(), // quantity scale
  sts: z.number(), // symbol trading status
  st: z.number(), // state
  tt: z.number(), // trading type
  ot: z.number().optional(), // open time
});

export const SnipeTargetSchema = z.object({
  vcoinId: z.string(),
  symbol: z.string(),
  projectName: z.string(),
  priceDecimalPlaces: z.number(),
  quantityDecimalPlaces: z.number(),
  launchTime: z.date(),
  discoveredAt: z.date(),
  hoursAdvanceNotice: z.number(),
  orderParameters: z.record(z.any()),
});

export const CalendarResponseSchema = z.object({
  data: z.array(CalendarEntrySchema),
});

export const SymbolsV2ResponseSchema = z.object({
  data: z.object({
    symbols: z.array(SymbolV2EntrySchema),
  }),
});

// Type inference
export type CalendarEntry = z.infer<typeof CalendarEntrySchema>;
export type SymbolV2Entry = z.infer<typeof SymbolV2EntrySchema>;
export type SnipeTarget = z.infer<typeof SnipeTargetSchema>;

// api.ts
import axios from 'axios';
import { CalendarResponseSchema, SymbolsV2ResponseSchema } from './schemas';

const api = axios.create({
  timeout: 10000,
});

export const mexcApi = {
  getCalendar: async () => {
    const response = await api.get('https://api.mexc.com/api/operation/new_coin_calendar');
    return CalendarResponseSchema.parse(response.data);
  },

  getSymbolsV2: async () => {
    const response = await api.get('https://api.mexc.com/api/platform/spot/market-v2/web/symbolsV2');
    return SymbolsV2ResponseSchema.parse(response.data);
  },
};

// hooks.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { mexcApi } from './api';
import { CalendarEntry, SymbolV2Entry, SnipeTarget } from './schemas';

const READY_STATE_PATTERN = { sts: 2, st: 2, tt: 4 } as const;

// Query keys
export const queryKeys = {
  calendar: ['mexc', 'calendar'] as const,
  symbolsV2: ['mexc', 'symbolsV2'] as const,
};

// TanStack Query hooks
export const useCalendarQuery = () => {
  return useQuery({
    queryKey: queryKeys.calendar,
    queryFn: mexcApi.getCalendar,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    staleTime: 4 * 60 * 1000, // 4 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useSymbolsV2Query = (enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.symbolsV2,
    queryFn: mexcApi.getSymbolsV2,
    refetchInterval: enabled ? 30 * 1000 : false, // 30 seconds when enabled
    staleTime: 25 * 1000, // 25 seconds
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
};

// Pattern matching utilities
const matchesReadyPattern = (symbol: SymbolV2Entry): boolean => {
  return symbol.sts === READY_STATE_PATTERN.sts &&
         symbol.st === READY_STATE_PATTERN.st &&
         symbol.tt === READY_STATE_PATTERN.tt;
};

const hasCompleteData = (symbol: SymbolV2Entry): boolean => {
  return !!(symbol.ca && symbol.ps && symbol.qs && symbol.ot);
};

// Main Pattern Sniper Hook
export const usePatternSniper = () => {
  const queryClient = useQueryClient();
  const [calendarTargets, setCalendarTargets] = useState<Map<string, CalendarEntry>>(new Map());
  const [pendingDetection, setPendingDetection] = useState<Set<string>>(new Set());
  const [readyTargets, setReadyTargets] = useState<Map<string, SnipeTarget>>(new Map());
  const [executedTargets, setExecutedTargets] = useState<Set<string>>(new Set());
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Calendar monitoring
  const { data: calendarData, error: calendarError, isLoading: calendarLoading } = useCalendarQuery();
  
  // Symbols monitoring (only when we have pending detections)
  const { data: symbolsData, error: symbolsError, isLoading: symbolsLoading } = useSymbolsV2Query(
    pendingDetection.size > 0
  );

  // Process calendar data
  useEffect(() => {
    if (!calendarData?.data) return;

    const now = new Date();
    const newTargets = new Map(calendarTargets);
    const newPending = new Set(pendingDetection);

    for (const entry of calendarData.data) {
      const launchTime = new Date(entry.firstOpenTime);
      
      if (launchTime > now && !newTargets.has(entry.vcoinId)) {
        console.log(`📅 New listing detected: ${entry.symbol} at ${launchTime}`);
        newTargets.set(entry.vcoinId, entry);
        newPending.add(entry.vcoinId);
      }
    }

    setCalendarTargets(newTargets);
    setPendingDetection(newPending);
  }, [calendarData, calendarTargets, pendingDetection]);

  // Process symbols data for ready states
  useEffect(() => {
    if (!symbolsData?.data?.symbols || pendingDetection.size === 0) return;

    const symbols = symbolsData.data.symbols;
    const newPending = new Set(pendingDetection);
    const newReady = new Map(readyTargets);

    for (const vcoinId of pendingDetection) {
      const symbol = symbols.find(s => s.cd === vcoinId);
      
      if (symbol && matchesReadyPattern(symbol) && hasCompleteData(symbol)) {
        const calendar = calendarTargets.get(vcoinId);
        if (calendar) {
          const target = processReadyToken(vcoinId, symbol, calendar);
          newReady.set(symbol.ca!, target);
          newPending.delete(vcoinId);
          
          console.log(`✅ READY STATE: ${symbol.ca}`);
          console.log(`   Pattern: sts:${symbol.sts}, st:${symbol.st}, tt:${symbol.tt}`);
          console.log(`   Launch in: ${target.hoursAdvanceNotice.toFixed(1)} hours`);
        }
      }
    }

    setPendingDetection(newPending);
    setReadyTargets(newReady);
  }, [symbolsData, pendingDetection, calendarTargets, readyTargets]);

  // Process ready token into snipe target
  const processReadyToken = useCallback((
    vcoinId: string, 
    symbol: SymbolV2Entry, 
    calendar: CalendarEntry
  ): SnipeTarget => {
    const launchTime = new Date(symbol.ot!);
    const hoursAdvance = (launchTime.getTime() - Date.now()) / (1000 * 60 * 60);

    return {
      vcoinId,
      symbol: symbol.ca!,
      projectName: calendar.projectName,
      priceDecimalPlaces: symbol.ps!,
      quantityDecimalPlaces: symbol.qs!,
      launchTime,
      discoveredAt: new Date(),
      hoursAdvanceNotice: hoursAdvance,
      orderParameters: {
        symbol: symbol.ca,
        side: 'BUY',
        type: 'MARKET',
        quoteOrderQty: 100,
      },
    };
  }, []);

  // Execute snipes
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      const now = new Date();
      const newExecuted = new Set(executedTargets);

      for (const [symbol, target] of readyTargets) {
        if (executedTargets.has(symbol)) continue;

        const timeUntil = target.launchTime.getTime() - now.getTime();

        if (timeUntil <= 0 && timeUntil > -5000) { // Within 5 seconds of launch
          executeSnipe(target);
          newExecuted.add(symbol);
        }
      }

      setExecutedTargets(newExecuted);
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, readyTargets, executedTargets]);

  // Execute individual snipe
  const executeSnipe = useCallback(async (target: SnipeTarget) => {
    console.log(`🚀 EXECUTING SNIPE: ${target.symbol}`);
    console.log(`   Order: ${JSON.stringify(target.orderParameters, null, 2)}`);
    
    // TODO: Implement actual order execution
    // This would integrate with your MEXC trading API
    try {
      // await mexcTradingApi.placeOrder(target.orderParameters);
      console.log(`✅ Snipe executed successfully for ${target.symbol}`);
    } catch (error) {
      console.error(`❌ Snipe failed for ${target.symbol}:`, error);
    }
  }, []);

  // Control functions
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    console.log('🚀 Pattern Sniper started');
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    console.log('⏹️ Pattern Sniper stopped');
  }, []);

  const clearTargets = useCallback(() => {
    setCalendarTargets(new Map());
    setPendingDetection(new Set());
    setReadyTargets(new Map());
    setExecutedTargets(new Set());
    console.log('🧹 All targets cleared');
  }, []);

  // Force refresh data
  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.calendar });
    queryClient.invalidateQueries({ queryKey: queryKeys.symbolsV2 });
  }, [queryClient]);

  return {
    // State
    isMonitoring,
    calendarTargets: Array.from(calendarTargets.values()),
    pendingDetection: Array.from(pendingDetection),
    readyTargets: Array.from(readyTargets.values()),
    executedTargets: Array.from(executedTargets),

    // Loading states
    isLoading: calendarLoading || symbolsLoading,
    errors: {
      calendar: calendarError,
      symbols: symbolsError,
    },

    // Statistics
    stats: {
      totalListings: calendarTargets.size,
      pendingDetection: pendingDetection.size,
      readyToSnipe: readyTargets.size,
      executed: executedTargets.size,
    },

    // Actions
    startMonitoring,
    stopMonitoring,
    clearTargets,
    refreshData,
  };
};

// component.tsx - Example React Component
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { usePatternSniper } from './hooks';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
    },
  },
});

const PatternSniperComponent: React.FC = () => {
  const {
    isMonitoring,
    calendarTargets,
    pendingDetection,
    readyTargets,
    executedTargets,
    isLoading,
    errors,
    stats,
    startMonitoring,
    stopMonitoring,
    clearTargets,
    refreshData,
  } = usePatternSniper();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">MEXC Pattern Sniper</h1>
      
      {/* Controls */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={isMonitoring ? stopMonitoring : startMonitoring}
          className={`px-4 py-2 rounded font-medium ${
            isMonitoring 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isMonitoring ? '⏹️ Stop' : '▶️ Start'} Monitoring
        </button>
        
        <button
          onClick={refreshData}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium"
        >
          🔄 Refresh
        </button>
        
        <button
          onClick={clearTargets}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-medium"
        >
          🧹 Clear
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800">Total Listings</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalListings}</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg">
          <h3 className="font-semibold text-yellow-800">Pending Detection</h3>
          <p className="text-2xl font-bold text-yellow-600">{stats.pendingDetection}</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">Ready to Snipe</h3>
          <p className="text-2xl font-bold text-green-600">{stats.readyToSnipe}</p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-800">Executed</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.executed}</p>
        </div>
      </div>

      {/* Loading & Errors */}
      {isLoading && <p className="text-blue-600 mb-4">🔄 Loading data...</p>}
      
      {errors.calendar && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Calendar Error: {errors.calendar.message}
        </div>
      )}
      
      {errors.symbols && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Symbols Error: {errors.symbols.message}
        </div>
      )}

      {/* Ready Targets */}
      {readyTargets.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3">🎯 Ready to Snipe</h2>
          <div className="space-y-3">
            {readyTargets.map((target) => (
              <div key={target.symbol} className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-green-800">{target.symbol}</h3>
                    <p className="text-green-600">{target.projectName}</p>
                    <p className="text-sm text-green-500">
                      Launch: {target.launchTime.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-600">
                      {target.hoursAdvanceNotice.toFixed(1)}h advance
                    </p>
                    <p className="text-xs text-gray-500">
                      Discovered: {target.discoveredAt.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Price Scale: {target.priceDecimalPlaces} | Quantity Scale: {target.quantityDecimalPlaces}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Targets */}
      {calendarTargets.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3">📅 Upcoming Listings</h2>
          <div className="space-y-2">
            {calendarTargets.map((target) => (
              <div key={target.vcoinId} className="bg-blue-50 border border-blue-200 p-3 rounded">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{target.symbol}</span>
                    <span className="text-gray-600 ml-2">{target.projectName}</span>
                  </div>
                  <span className="text-sm text-blue-600">
                    {new Date(target.firstOpenTime).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executed Targets */}
      {executedTargets.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-3">✅ Executed Snipes</h2>
          <div className="space-y-2">
            {executedTargets.map((symbol) => (
              <div key={symbol} className="bg-gray-50 border border-gray-200 p-3 rounded">
                <span className="font-medium">{symbol}</span>
                <span className="text-gray-500 ml-2">Executed</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// App wrapper with QueryClient
export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <PatternSniperComponent />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;