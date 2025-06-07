/**
 * Task #12: Transaction History API Tests
 * TDD tests for implementing transaction history endpoints with CSV/JSON export capabilities
 * Requirements:
 * - Create GET endpoints for transaction history
 * - Support CSV/JSON export
 * - Store in PostgreSQL
 * - Example: GET /transactions?format=csv
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Logger,
  type MexcClient,
  type PostgresDB,
  TaskTwelveTransactionHistoryService,
  type TransactionRecord,
} from '../task-12-transaction-history-service';

// Mock implementations
const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

const mockMexcClient: MexcClient = {
  getAccountTrades: vi.fn(),
  getCurrentPrices: vi.fn(),
  getAccountInfo: vi.fn(),
};

const mockPostgresDB: PostgresDB = {
  query: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
};

describe('Task #12: Transaction History API with Export Capabilities', () => {
  let transactionService: TaskTwelveTransactionHistoryService;

  const mockTransactions: TransactionRecord[] = [
    {
      id: 'tx-001',
      userId: 'user-123',
      externalId: 'mexc-trade-001',
      type: 'trade',
      symbol: 'BTCUSDT',
      side: 'buy',
      quantity: '0.5',
      price: '45000.00',
      value: '22500.00',
      fee: '0.001',
      feeAsset: 'BTC',
      orderId: 'order-123',
      notes: 'Market buy order',
      timestamp: '2024-01-01T10:00:00.000Z',
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-01T10:00:00.000Z',
    },
    {
      id: 'tx-002',
      userId: 'user-123',
      externalId: 'mexc-trade-002',
      type: 'trade',
      symbol: 'ETHUSDT',
      side: 'sell',
      quantity: '2.0',
      price: '3000.00',
      value: '6000.00',
      fee: '1.5',
      feeAsset: 'USDT',
      orderId: 'order-124',
      notes: 'Limit sell order',
      timestamp: '2024-01-02T14:30:00.000Z',
      createdAt: '2024-01-02T14:30:00.000Z',
      updatedAt: '2024-01-02T14:30:00.000Z',
    },
    {
      id: 'tx-003',
      userId: 'user-123',
      externalId: null,
      type: 'deposit',
      symbol: null,
      side: null,
      quantity: '1000.00',
      price: null,
      value: '1000.00',
      fee: '0.00',
      feeAsset: 'USDT',
      orderId: null,
      notes: 'Bank transfer deposit',
      timestamp: '2024-01-03T09:15:00.000Z',
      createdAt: '2024-01-03T09:15:00.000Z',
      updatedAt: '2024-01-03T09:15:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock responses
    (mockPostgresDB.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: mockTransactions,
      rowCount: mockTransactions.length,
    });
    (mockPostgresDB.insert as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      insertId: 1,
    });
    (mockPostgresDB.transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (db: PostgresDB) => Promise<unknown>) => await fn(mockPostgresDB)
    );

    transactionService = new TaskTwelveTransactionHistoryService(
      mockLogger,
      mockMexcClient,
      mockPostgresDB
    );
  });

  describe('Transaction History Retrieval', () => {
    it('should retrieve transaction history with default pagination', async () => {
      const result = await transactionService.getTransactionHistory({
        userId: 'user-123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.transactions).toHaveLength(3);
      expect(result.data?.total).toBe(3);
      expect(result.data?.limit).toBe(50);
      expect(result.data?.offset).toBe(0);
      expect(mockPostgresDB.query).toHaveBeenCalled();
    });

    it('should apply pagination filters correctly', async () => {
      const result = await transactionService.getTransactionHistory({
        userId: 'user-123',
        limit: 10,
        offset: 0,
      });

      expect(result.success).toBe(true);
      expect(mockPostgresDB.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 10 OFFSET 0'),
        expect.any(Array)
      );
    });

    it('should filter by transaction type', async () => {
      const result = await transactionService.getTransactionHistory({
        userId: 'user-123',
        type: 'trade',
      });

      expect(result.success).toBe(true);
      expect(mockPostgresDB.query).toHaveBeenCalledWith(
        expect.stringContaining('type = $'),
        expect.arrayContaining(['trade'])
      );
    });

    it('should filter by symbol', async () => {
      const result = await transactionService.getTransactionHistory({
        userId: 'user-123',
        symbol: 'BTCUSDT',
      });

      expect(result.success).toBe(true);
      expect(mockPostgresDB.query).toHaveBeenCalledWith(
        expect.stringContaining('symbol = $'),
        expect.arrayContaining(['BTCUSDT'])
      );
    });

    it('should filter by date range', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-02T23:59:59.000Z');

      const result = await transactionService.getTransactionHistory({
        userId: 'user-123',
        startTime,
        endTime,
      });

      expect(result.success).toBe(true);
      expect(mockPostgresDB.query).toHaveBeenCalledWith(
        expect.stringContaining('timestamp >= $'),
        expect.arrayContaining([startTime])
      );
    });

    it('should sort transactions by timestamp descending by default', async () => {
      const result = await transactionService.getTransactionHistory({
        userId: 'user-123',
      });

      expect(result.success).toBe(true);
      expect(mockPostgresDB.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp DESC'),
        expect.any(Array)
      );
    });

    it('should handle custom sorting options', async () => {
      const result = await transactionService.getTransactionHistory({
        userId: 'user-123',
        sortBy: 'value',
        sortOrder: 'asc',
      });

      expect(result.success).toBe(true);
      expect(mockPostgresDB.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY value ASC'),
        expect.any(Array)
      );
    });
  });

  describe('CSV Export Functionality', () => {
    it('should export transactions as CSV format', async () => {
      const result = await transactionService.exportTransactions({
        userId: 'user-123',
        format: 'csv',
      });

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('csv');
      expect(result.data?.filename).toMatch(/transactions_\d{4}-\d{2}-\d{2}\.csv/);
      expect(typeof result.data?.data).toBe('string');

      // Verify CSV headers
      const csvContent = result.data?.data as string;
      expect(csvContent).toContain('ID,Type,Symbol,Side,Quantity,Price,Value,Fee,Timestamp');
    });

    it('should include all transaction data in CSV export', async () => {
      const result = await transactionService.exportTransactions({
        userId: 'user-123',
        format: 'csv',
      });

      expect(result.success).toBe(true);
      const csvContent = result.data?.data as string;
      const lines = csvContent.split('\n');

      expect(lines).toHaveLength(4); // Header + 3 data rows
      expect(lines[1]).toContain('tx-001,trade,BTCUSDT,buy,0.5,45000.00,22500.00,0.001');
      expect(lines[2]).toContain('tx-002,trade,ETHUSDT,sell,2.0,3000.00,6000.00,1.5');
      expect(lines[3]).toContain('tx-003,deposit,,,,1000.00,1000.00,0.00');
    });

    it('should handle null values in CSV export', async () => {
      const result = await transactionService.exportTransactions({
        userId: 'user-123',
        format: 'csv',
      });

      expect(result.success).toBe(true);
      const csvContent = result.data?.data as string;
      expect(csvContent).toContain(',,'); // Empty fields for null values
    });
  });

  describe('JSON Export Functionality', () => {
    it('should export transactions as JSON format', async () => {
      const result = await transactionService.exportTransactions({
        userId: 'user-123',
        format: 'json',
      });

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('json');
      expect(result.data?.filename).toMatch(/transactions_\d{4}-\d{2}-\d{2}\.json/);
      expect(Array.isArray(result.data?.data)).toBe(true);
    });

    it('should include all transaction fields in JSON export', async () => {
      const result = await transactionService.exportTransactions({
        userId: 'user-123',
        format: 'json',
      });

      expect(result.success).toBe(true);
      const jsonData = result.data?.data as TransactionRecord[];

      expect(jsonData).toHaveLength(3);
      expect(jsonData[0]).toMatchObject({
        id: 'tx-001',
        type: 'trade',
        symbol: 'BTCUSDT',
        side: 'buy',
        quantity: '0.5',
        price: '45000.00',
        value: '22500.00',
      });
    });
  });

  describe('Transaction Statistics', () => {
    it('should calculate transaction statistics correctly', async () => {
      (mockPostgresDB.query as unknown as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: mockTransactions, rowCount: 3 })
        .mockResolvedValueOnce({
          rows: [
            {
              total_volume: '29500.00',
              total_fees: '1.501',
              avg_value: '9833.33',
              trade_count: '2',
              deposit_count: '1',
              withdrawal_count: '0',
            },
          ],
        });

      const result = await transactionService.getTransactionStats({
        userId: 'user-123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.totalTransactions).toBe(3);
      expect(result.data?.totalVolume).toBe('29500.00');
      expect(result.data?.totalFees).toBe('1.501');
      expect(result.data?.avgTransactionValue).toBe('9833.33');
      expect(result.data?.transactionsByType).toEqual({
        trade: 2,
        deposit: 1,
        withdrawal: 0,
      });
    });

    it('should calculate stats for date range', async () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const endTime = new Date('2024-01-02T23:59:59.000Z');

      await transactionService.getTransactionStats({
        userId: 'user-123',
        startTime,
        endTime,
      });

      expect(mockPostgresDB.query).toHaveBeenCalledWith(
        expect.stringContaining('timestamp >= $'),
        expect.arrayContaining([startTime, endTime])
      );
    });
  });

  describe('Individual Transaction Retrieval', () => {
    it('should retrieve individual transaction by ID', async () => {
      (mockPostgresDB.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [mockTransactions[0]],
        rowCount: 1,
      });

      const result = await transactionService.getTransactionById('tx-001', 'user-123');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('tx-001');
      expect(result.data?.type).toBe('trade');
      expect(mockPostgresDB.query).toHaveBeenCalledWith(
        expect.stringContaining('id = $1 AND user_id = $2'),
        ['tx-001', 'user-123']
      );
    });

    it('should return null for non-existent transaction', async () => {
      (mockPostgresDB.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const result = await transactionService.getTransactionById('non-existent', 'user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should enforce user isolation in transaction retrieval', async () => {
      await transactionService.getTransactionById('tx-001', 'different-user');

      expect(mockPostgresDB.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $2'),
        expect.arrayContaining(['different-user'])
      );
    });
  });

  describe('Transaction Sync from MEXC', () => {
    it('should sync transactions from MEXC API', async () => {
      const mexcTrades = [
        {
          id: 'mexc-001',
          symbol: 'BTCUSDT',
          side: 'BUY',
          qty: '0.1',
          price: '46000.00',
          commission: '0.0001',
          commissionAsset: 'BTC',
          time: 1704110400000, // 2024-01-01T12:00:00.000Z
          orderId: 'order-001',
        },
      ];

      (mockMexcClient.getAccountTrades as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mexcTrades
      );

      const result = await transactionService.syncTransactionsFromMEXC('user-123');

      expect(result.success).toBe(true);
      expect(result.data?.syncedCount).toBe(1);
      expect(mockMexcClient.getAccountTrades).toHaveBeenCalled();
      expect(mockPostgresDB.insert).toHaveBeenCalled();
    });

    it('should handle MEXC API errors gracefully', async () => {
      (mockMexcClient.getAccountTrades as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('MEXC API Error')
      );

      const result = await transactionService.syncTransactionsFromMEXC('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('MEXC API Error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should avoid duplicate transactions during sync', async () => {
      // Mock existing transaction check
      (mockPostgresDB.query as unknown as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ rows: [{ external_id: 'mexc-001' }] })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const mexcTrades = [
        {
          id: 'mexc-001', // Already exists
          symbol: 'BTCUSDT',
          side: 'BUY',
          qty: '0.1',
          price: '46000.00',
          commission: '0.0001',
          commissionAsset: 'BTC',
          time: 1704110400000,
          orderId: 'order-001',
        },
        {
          id: 'mexc-002', // New transaction
          symbol: 'ETHUSDT',
          side: 'SELL',
          qty: '1.0',
          price: '3100.00',
          commission: '0.775',
          commissionAsset: 'USDT',
          time: 1704196800000,
          orderId: 'order-002',
        },
      ];

      (mockMexcClient.getAccountTrades as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        mexcTrades
      );

      const result = await transactionService.syncTransactionsFromMEXC('user-123');

      expect(result.success).toBe(true);
      expect(result.data?.syncedCount).toBe(1); // Only one new transaction
      expect(result.data?.skippedCount).toBe(1); // One duplicate skipped
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Create a fresh service instance and mock for this test
      const errorMockDB: PostgresDB = {
        query: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        transaction: vi.fn(),
      };

      const errorTestService = new TaskTwelveTransactionHistoryService(
        mockLogger,
        mockMexcClient,
        errorMockDB
      );

      const result = await errorTestService.getTransactionHistory({
        userId: 'user-123',
        forceRefresh: true, // Force database query to test error handling
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should validate user ID requirement', async () => {
      const result = await transactionService.getTransactionHistory({
        userId: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });

    it('should handle invalid date ranges', async () => {
      const startTime = new Date('2024-01-02T00:00:00.000Z');
      const endTime = new Date('2024-01-01T00:00:00.000Z'); // End before start

      const result = await transactionService.getTransactionHistory({
        userId: 'user-123',
        startTime,
        endTime,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('End time must be after start time');
    });

    it('should include timestamp in all responses', async () => {
      const result = await transactionService.getTransactionHistory({
        userId: 'user-123',
      });

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('number');
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Performance and Caching', () => {
    it('should cache transaction history for 5 minutes', async () => {
      const result1 = await transactionService.getTransactionHistory({
        userId: 'user-123',
      });

      const result2 = await transactionService.getTransactionHistory({
        userId: 'user-123',
      });

      expect(result1.data).toEqual(result2.data);
      expect(mockPostgresDB.query).toHaveBeenCalledTimes(1); // Only called once due to cache
    });

    it('should force refresh when requested', async () => {
      await transactionService.getTransactionHistory({ userId: 'user-123' });
      await transactionService.getTransactionHistory({
        userId: 'user-123',
        forceRefresh: true,
      });

      expect(mockPostgresDB.query).toHaveBeenCalledTimes(2);
    });

    it('should respond within 500ms for cached data', async () => {
      // Prime the cache
      await transactionService.getTransactionHistory({ userId: 'user-123' });

      const startTime = Date.now();
      await transactionService.getTransactionHistory({ userId: 'user-123' });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('Data Validation', () => {
    it('should validate transaction data structure', async () => {
      const result = await transactionService.getTransactionHistory({
        userId: 'user-123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (!result.data) throw new Error('Expected data to be defined');
      const { transactions } = result.data;

      for (const transaction of transactions) {
        expect(transaction).toHaveProperty('id');
        expect(transaction).toHaveProperty('userId');
        expect(transaction).toHaveProperty('type');
        expect(transaction).toHaveProperty('value');
        expect(transaction).toHaveProperty('timestamp');

        expect(typeof transaction.id).toBe('string');
        expect(typeof transaction.userId).toBe('string');
        expect(typeof transaction.type).toBe('string');
        expect(typeof transaction.value).toBe('string');
        expect(typeof transaction.timestamp).toBe('string');
      }
    });

    it('should ensure numeric values are properly formatted', async () => {
      const result = await transactionService.getTransactionHistory({
        userId: 'user-123',
      });

      expect(result.success).toBe(true);
      if (!result.data) throw new Error('Expected data to be defined');
      const { transactions } = result.data;

      for (const transaction of transactions) {
        if (transaction.quantity) {
          expect(Number.isNaN(Number(transaction.quantity))).toBe(false);
        }
        if (transaction.price) {
          expect(Number.isNaN(Number(transaction.price))).toBe(false);
        }
        expect(Number.isNaN(Number(transaction.value))).toBe(false);
        if (transaction.fee) {
          expect(Number.isNaN(Number(transaction.fee))).toBe(false);
        }
      }
    });
  });

  describe('Comprehensive Logging', () => {
    it('should log transaction history requests', async () => {
      await transactionService.getTransactionHistory({
        userId: 'user-123',
        type: 'trade',
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Transaction history request', {
        userId: 'user-123',
        filters: expect.objectContaining({ type: 'trade' }),
        timestamp: expect.any(Number),
      });
    });

    it('should log export operations', async () => {
      await transactionService.exportTransactions({
        userId: 'user-123',
        format: 'csv',
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Transaction export completed', {
        userId: 'user-123',
        format: 'csv',
        transactionCount: expect.any(Number),
        processingTime: expect.any(Number),
      });
    });

    it('should log sync operations', async () => {
      (mockMexcClient.getAccountTrades as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        []
      );

      await transactionService.syncTransactionsFromMEXC('user-123');

      expect(mockLogger.info).toHaveBeenCalledWith('MEXC transaction sync completed', {
        userId: 'user-123',
        syncedCount: 0,
        skippedCount: 0,
        processingTime: expect.any(Number),
      });
    });
  });
});
