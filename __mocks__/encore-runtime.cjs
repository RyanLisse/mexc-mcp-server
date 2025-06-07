/**
 * Mock Encore Runtime for Testing
 * Prevents import errors during test execution
 */

module.exports = {
  // Mock runtime functions
  initialize: () => {},
  cleanup: () => {},

  // Mock API functions
  callHandler: async () => ({ success: true }),

  // Mock configuration
  config: {
    environment: 'test',
    appName: 'mexc-mcp-server',
  },
};
