/**
 * Vitest Setup File
 * Configures test environment for MEXC MCP Server
 */

// Set environment variables before any imports
process.env.ENCORE_RUNTIME_LIB = '/dev/null';
process.env.NODE_ENV = 'test';

// Mock console to reduce test noise (optional)
global.console = {
  ...console,
  // Comment out the line below if you want to see console.log during tests
  log: () => {},
};
