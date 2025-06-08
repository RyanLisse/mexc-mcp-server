/**
 * Shared Database Configuration for MEXC MCP Server
 * Centralized database instance for all services
 */

import { SQLDatabase } from 'encore.dev/storage/sqldb';

// Single shared database for all services
export const db = new SQLDatabase('mexc_mcp', {
  migrations: './audit/migrations',
});
