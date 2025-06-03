/**
 * Configuration management for MEXC MCP Server
 */

export interface ServerConfig {
  mexc: {
    apiKey: string;
    secretKey: string;
    baseUrl: string;
    websocketUrl: string;
  };
  server: {
    port: number;
    nodeEnv: string;
    logLevel: string;
  };
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  cache: {
    ttlTicker: number;
    ttlOrderbook: number;
    ttlStats: number;
  };
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
}

export function loadConfig(): ServerConfig {
  return {
    mexc: {
      apiKey: getEnvVar('MEXC_API_KEY'),
      secretKey: getEnvVar('MEXC_SECRET_KEY'),
      baseUrl: getEnvVar('MEXC_BASE_URL', 'https://api.mexc.com'),
      websocketUrl: getEnvVar('MEXC_WEBSOCKET_URL', 'wss://wbs.mexc.com/ws'),
    },
    server: {
      port: getEnvNumber('PORT', 3000),
      nodeEnv: getEnvVar('NODE_ENV', 'development'),
      logLevel: getEnvVar('LOG_LEVEL', 'info'),
    },
    rateLimit: {
      maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
      windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
    },
    cache: {
      ttlTicker: getEnvNumber('CACHE_TTL_TICKER', 5000),
      ttlOrderbook: getEnvNumber('CACHE_TTL_ORDERBOOK', 2000),
      ttlStats: getEnvNumber('CACHE_TTL_STATS', 10000),
    },
  };
}

// Global config instance
export const config = loadConfig();

// Validation functions
export function validateMexcCredentials(): boolean {
  const { apiKey, secretKey } = config.mexc;
  
  // Validate API key format
  const apiKeyRegex = /^mx0v[a-zA-Z0-9]+$/;
  if (!apiKeyRegex.test(apiKey)) {
    return false;
  }
  
  // Validate secret key (should be hex string)
  const secretKeyRegex = /^[a-f0-9]{32,}$/i;
  if (!secretKeyRegex.test(secretKey)) {
    return false;
  }
  
  return true;
}

export function isDevelopment(): boolean {
  return config.server.nodeEnv === 'development';
}

export function isProduction(): boolean {
  return config.server.nodeEnv === 'production';
}
