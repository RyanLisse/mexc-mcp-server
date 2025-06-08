/**
 * Configuration management for MEXC MCP Server
 * Uses Encore.ts secrets for secure credential management
 */

// Secrets will be imported dynamically when needed

/**
 * AI-specific configuration interface
 */
export interface AIConfig {
  google: {
    /** Google Generative AI API key */
    apiKey: string;
    /** Model identifier (e.g., gemini-2.5-flash-preview-05-20) */
    model: string;
    /** Maximum tokens per request */
    maxTokens: number;
    /** Model temperature (0-2) */
    temperature: number;
    /** Top-k sampling parameter */
    topK?: number;
    /** Top-p sampling parameter */
    topP?: number;
  };
  /** Thinking budget management */
  budget: {
    /** Maximum cost in USD per day */
    maxCostPerDay: number;
    /** Maximum tokens per hour */
    maxTokensPerHour: number;
    /** Maximum requests per minute */
    maxRequestsPerMinute: number;
    /** Cost per million tokens in USD */
    costPerMillionTokens: number;
    /** Budget reset hour (0-23) */
    budgetResetHour: number;
  };
  /** AI response caching configuration */
  cache: {
    /** Enable AI response caching */
    enabled: boolean;
    /** Default cache TTL in milliseconds */
    defaultTTL: number;
    /** Maximum cache size in MB */
    maxSizeMB: number;
    /** Cache TTL for sentiment analysis */
    sentimentTTL: number;
    /** Cache TTL for technical analysis */
    technicalTTL: number;
    /** Cache TTL for risk assessment */
    riskTTL: number;
    /** Enable cache compression */
    compression: boolean;
  };
  /** Risk and safety configuration */
  risk: {
    /** Maximum risk level threshold (low/medium/high) */
    maxRiskLevel: 'low' | 'medium' | 'high';
    /** Minimum confidence threshold (0-1) */
    minConfidenceThreshold: number;
    /** Enable content filtering */
    enableContentFilter: boolean;
    /** Maximum position size for risk assessment (percentage) */
    maxPositionSizePercent: number;
    /** Risk assessment timeout in milliseconds */
    assessmentTimeoutMs: number;
    /** Enable safety validation */
    enableSafetyValidation: boolean;
  };
  /** Rate limiting configuration */
  rateLimit: {
    /** Maximum requests per minute */
    maxRequests: number;
    /** Rate limit window in milliseconds */
    windowMs: number;
    /** Burst limit for temporary spikes */
    burstLimit: number;
    /** Enable adaptive rate limiting */
    adaptive: boolean;
    /** Cleanup interval for rate limiters */
    cleanupIntervalMs: number;
    /** Authenticated user limits */
    authenticated: {
      maxRequests: number;
      windowMs: number;
    };
    /** Unauthenticated user limits */
    unauthenticated: {
      maxRequests: number;
      windowMs: number;
    };
  };
  /** Analysis configuration */
  analysis: {
    /** Default analysis depth */
    defaultDepth: 'basic' | 'detailed' | 'comprehensive';
    /** Enable confidence intervals */
    enableConfidenceIntervals: boolean;
    /** Historical context window in hours */
    contextWindowHours: number;
    /** Maximum retry attempts for failed analysis */
    maxRetryAttempts: number;
    /** Retry delay in milliseconds */
    retryDelayMs: number;
    /** Enable parallel analysis processing */
    enableParallelProcessing: boolean;
  };
  /** Debug and monitoring configuration */
  debug: {
    /** Enable debug mode */
    enabled: boolean;
    /** Log AI requests/responses */
    logRequests: boolean;
    /** Enable performance monitoring */
    enableMetrics: boolean;
    /** Save failed requests for debugging */
    saveFailedRequests: boolean;
    /** Debug log level */
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

export interface ServerConfig {
  mexc: {
    apiKey: string;
    secretKey: string;
    baseUrl: string;
    websocketUrl: string;
    /** MEXC client configuration */
    client: {
      batchSize: number;
      timeDiffToleranceMs: number;
      retryWindowMs: number;
      timeoutMs: number;
      maxRetries: number;
    };
  };
  ai: AIConfig;
  server: {
    port: number;
    nodeEnv: string;
    logLevel: string;
  };
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  mexcRateLimit: {
    orderLimit: number;
    batchOrderLimit: number;
    defaultWeight: number;
    maxWeight: number;
    websocketLimit: number;
    maxWebsocketStreams: number;
  };
  cache: {
    ttlTicker: number;
    ttlOrderbook: number;
    ttlStats: number;
  };
  /** Sniping bot configuration */
  sniping: {
    polling: {
      distantIntervalMs: number;
      approachingIntervalMs: number;
      imminentIntervalMs: number;
      distantThresholdMs: number;
      approachingThresholdMs: number;
    };
    execution: {
      maxRetries: number;
      timeoutMs: number;
      slippageTolerancePercent: number;
    };
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

function getEnvFloat(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

// async function getMexcCredentials(): Promise<{ apiKey: string; secretKey: string }> {
//   try {
//     // Try to import secrets dynamically (only works in Encore service context)
//     const { getMexcCredentials } = await import('./secrets');
//     return getMexcCredentials();
//   } catch (_error) {
//     // Fallback to environment variables for local development
//     return {
//       apiKey: getEnvVar('MEXC_API_KEY'),
//       secretKey: getEnvVar('MEXC_SECRET_KEY'),
//     };
//   }
// }

export function loadConfig(): ServerConfig {
  // Use environment variables as primary source, secrets as fallback in services
  const mexcCredentials = {
    apiKey: getEnvVar('MEXC_API_KEY', 'test-mexc-key'),
    secretKey: getEnvVar('MEXC_SECRET_KEY', 'test-mexc-secret'),
  };

  return {
    mexc: {
      apiKey: mexcCredentials.apiKey,
      secretKey: mexcCredentials.secretKey,
      baseUrl: getEnvVar('MEXC_BASE_URL', 'https://api.mexc.com'),
      websocketUrl: getEnvVar('MEXC_WEBSOCKET_URL', 'wss://wbs.mexc.com/ws'),
      client: {
        batchSize: getEnvNumber('MEXC_BATCH_SIZE', 100),
        timeDiffToleranceMs: getEnvNumber('MEXC_TIME_DIFF_TOLERANCE_MS', 5000),
        retryWindowMs: getEnvNumber('MEXC_RETRY_WINDOW_MS', 1000),
        timeoutMs: getEnvNumber('MEXC_TIMEOUT_MS', 30000),
        maxRetries: getEnvNumber('MEXC_MAX_RETRIES', 3),
      },
    },
    ai: {
      google: {
        apiKey: getEnvVar('GOOGLE_GENERATIVE_AI_API_KEY', 'test-api-key'),
        model: getEnvVar('GOOGLE_AI_MODEL', 'gemini-2.5-flash-preview-05-20'),
        maxTokens: getEnvNumber('GOOGLE_AI_MAX_TOKENS', 8192),
        temperature: getEnvFloat('GOOGLE_AI_TEMPERATURE', 0.7),
        topK: getEnvNumber('GOOGLE_AI_TOP_K', 40),
        topP: getEnvFloat('GOOGLE_AI_TOP_P', 0.95),
      },
      budget: {
        maxCostPerDay: getEnvFloat('AI_BUDGET_MAX_COST_PER_DAY', 10.0),
        maxTokensPerHour: getEnvNumber('AI_BUDGET_MAX_TOKENS_PER_HOUR', 100000),
        maxRequestsPerMinute: getEnvNumber('AI_BUDGET_MAX_REQUESTS_PER_MINUTE', 30),
        costPerMillionTokens: getEnvFloat('AI_BUDGET_COST_PER_MILLION_TOKENS', 0.00075),
        budgetResetHour: getEnvNumber('AI_BUDGET_RESET_HOUR', 0),
      },
      cache: {
        enabled: getEnvBoolean('AI_CACHE_ENABLED', true),
        defaultTTL: getEnvNumber('AI_CACHE_DEFAULT_TTL', 900000), // 15 minutes
        maxSizeMB: getEnvNumber('AI_CACHE_MAX_SIZE_MB', 100),
        sentimentTTL: getEnvNumber('AI_CACHE_SENTIMENT_TTL', 300000), // 5 minutes
        technicalTTL: getEnvNumber('AI_CACHE_TECHNICAL_TTL', 600000), // 10 minutes
        riskTTL: getEnvNumber('AI_CACHE_RISK_TTL', 180000), // 3 minutes
        compression: getEnvBoolean('AI_CACHE_COMPRESSION', true),
      },
      risk: {
        maxRiskLevel: getEnvVar('AI_RISK_MAX_LEVEL', 'medium') as 'low' | 'medium' | 'high',
        minConfidenceThreshold: getEnvFloat('AI_RISK_MIN_CONFIDENCE', 0.7),
        enableContentFilter: getEnvBoolean('AI_RISK_ENABLE_CONTENT_FILTER', true),
        maxPositionSizePercent: getEnvFloat('AI_RISK_MAX_POSITION_SIZE_PERCENT', 5.0),
        assessmentTimeoutMs: getEnvNumber('AI_RISK_ASSESSMENT_TIMEOUT_MS', 30000),
        enableSafetyValidation: getEnvBoolean('AI_RISK_ENABLE_SAFETY_VALIDATION', true),
      },
      rateLimit: {
        maxRequests: getEnvNumber('AI_RATE_LIMIT_MAX_REQUESTS', 50),
        windowMs: getEnvNumber('AI_RATE_LIMIT_WINDOW_MS', 60000),
        burstLimit: getEnvNumber('AI_RATE_LIMIT_BURST_LIMIT', 10),
        adaptive: getEnvBoolean('AI_RATE_LIMIT_ADAPTIVE', true),
        cleanupIntervalMs: getEnvNumber('AI_RATE_LIMIT_CLEANUP_INTERVAL_MS', 300000), // 5 minutes
        authenticated: {
          maxRequests: getEnvNumber('AUTH_RATE_LIMIT_MAX_REQUESTS', 1000),
          windowMs: getEnvNumber('AUTH_RATE_LIMIT_WINDOW_MS', 60000),
        },
        unauthenticated: {
          maxRequests: getEnvNumber('UNAUTH_RATE_LIMIT_MAX_REQUESTS', 100),
          windowMs: getEnvNumber('UNAUTH_RATE_LIMIT_WINDOW_MS', 60000),
        },
      },
      analysis: {
        defaultDepth: getEnvVar('AI_ANALYSIS_DEFAULT_DEPTH', 'detailed') as
          | 'basic'
          | 'detailed'
          | 'comprehensive',
        enableConfidenceIntervals: getEnvBoolean('AI_ANALYSIS_ENABLE_CONFIDENCE_INTERVALS', true),
        contextWindowHours: getEnvNumber('AI_ANALYSIS_CONTEXT_WINDOW_HOURS', 24),
        maxRetryAttempts: getEnvNumber('AI_ANALYSIS_MAX_RETRY_ATTEMPTS', 3),
        retryDelayMs: getEnvNumber('AI_ANALYSIS_RETRY_DELAY_MS', 1000),
        enableParallelProcessing: getEnvBoolean('AI_ANALYSIS_ENABLE_PARALLEL_PROCESSING', false),
      },
      debug: {
        enabled: getEnvBoolean(
          'AI_DEBUG_ENABLED',
          getEnvVar('NODE_ENV', 'development') === 'development'
        ),
        logRequests: getEnvBoolean(
          'AI_DEBUG_LOG_REQUESTS',
          getEnvVar('NODE_ENV', 'development') === 'development'
        ),
        enableMetrics: getEnvBoolean('AI_DEBUG_ENABLE_METRICS', true),
        saveFailedRequests: getEnvBoolean(
          'AI_DEBUG_SAVE_FAILED_REQUESTS',
          getEnvVar('NODE_ENV', 'development') === 'development'
        ),
        logLevel: getEnvVar(
          'AI_DEBUG_LOG_LEVEL',
          getEnvVar('NODE_ENV', 'development') === 'development' ? 'debug' : 'info'
        ) as 'error' | 'warn' | 'info' | 'debug',
      },
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
    mexcRateLimit: {
      orderLimit: getEnvNumber('MEXC_ORDER_LIMIT', 5), // 5 orders/second (effective Mar 25, 2025)
      batchOrderLimit: getEnvNumber('MEXC_BATCH_ORDER_LIMIT', 2), // 2 batches/second
      defaultWeight: getEnvNumber('MEXC_DEFAULT_WEIGHT', 1), // Default weight for endpoints
      maxWeight: getEnvNumber('MEXC_MAX_WEIGHT', 500), // 500 weight per 10 seconds per endpoint
      websocketLimit: getEnvNumber('MEXC_WEBSOCKET_LIMIT', 100), // 100 requests/second
      maxWebsocketStreams: getEnvNumber('MEXC_MAX_WEBSOCKET_STREAMS', 30), // 30 streams per connection
    },
    cache: {
      ttlTicker: getEnvNumber('CACHE_TTL_TICKER', 5000),
      ttlOrderbook: getEnvNumber('CACHE_TTL_ORDERBOOK', 2000),
      ttlStats: getEnvNumber('CACHE_TTL_STATS', 10000),
    },
    sniping: {
      polling: {
        distantIntervalMs: getEnvNumber('SNIPING_DISTANT_INTERVAL_MS', 300000), // 5 minutes
        approachingIntervalMs: getEnvNumber('SNIPING_APPROACHING_INTERVAL_MS', 30000), // 30 seconds
        imminentIntervalMs: getEnvNumber('SNIPING_IMMINENT_INTERVAL_MS', 2000), // 2 seconds
        distantThresholdMs: getEnvNumber('SNIPING_DISTANT_THRESHOLD_MS', 3600000), // 1 hour
        approachingThresholdMs: getEnvNumber('SNIPING_APPROACHING_THRESHOLD_MS', 600000), // 10 minutes
      },
      execution: {
        maxRetries: getEnvNumber('SNIPING_MAX_RETRIES', 3),
        timeoutMs: getEnvNumber('SNIPING_TIMEOUT_MS', 5000),
        slippageTolerancePercent: getEnvNumber('SNIPING_SLIPPAGE_TOLERANCE_PERCENT', 1),
      },
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

// AI Configuration Validation Functions

/**
 * Validates the AI configuration for completeness and correctness
 */
export function validateAIConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { ai } = config;

  // Validate Google API key
  if (!ai.google.apiKey || ai.google.apiKey === 'test-api-key') {
    errors.push('Google Generative AI API key is missing or using test key');
  }

  // Validate model parameters
  if (ai.google.temperature < 0 || ai.google.temperature > 2) {
    errors.push('AI temperature must be between 0 and 2');
  }

  if (ai.google.maxTokens < 1 || ai.google.maxTokens > 32768) {
    errors.push('AI maxTokens must be between 1 and 32768');
  }

  // Validate budget configuration
  if (ai.budget.maxCostPerDay <= 0) {
    errors.push('AI budget maxCostPerDay must be positive');
  }

  if (ai.budget.maxTokensPerHour <= 0) {
    errors.push('AI budget maxTokensPerHour must be positive');
  }

  if (ai.budget.maxRequestsPerMinute <= 0) {
    errors.push('AI budget maxRequestsPerMinute must be positive');
  }

  if (ai.budget.costPerMillionTokens <= 0) {
    errors.push('AI budget costPerMillionTokens must be positive');
  }

  if (ai.budget.budgetResetHour < 0 || ai.budget.budgetResetHour > 23) {
    errors.push('AI budget budgetResetHour must be between 0 and 23');
  }

  // Validate risk configuration
  if (!['low', 'medium', 'high'].includes(ai.risk.maxRiskLevel)) {
    errors.push('AI risk maxRiskLevel must be low, medium, or high');
  }

  if (ai.risk.minConfidenceThreshold < 0 || ai.risk.minConfidenceThreshold > 1) {
    errors.push('AI risk minConfidenceThreshold must be between 0 and 1');
  }

  if (ai.risk.maxPositionSizePercent <= 0 || ai.risk.maxPositionSizePercent > 100) {
    errors.push('AI risk maxPositionSizePercent must be between 0 and 100');
  }

  if (ai.risk.assessmentTimeoutMs <= 0) {
    errors.push('AI risk assessmentTimeoutMs must be positive');
  }

  // Validate cache configuration
  if (ai.cache.defaultTTL <= 0) {
    errors.push('AI cache defaultTTL must be positive');
  }

  if (ai.cache.maxSizeMB <= 0) {
    errors.push('AI cache maxSizeMB must be positive');
  }

  // Validate analysis configuration
  if (!['basic', 'detailed', 'comprehensive'].includes(ai.analysis.defaultDepth)) {
    errors.push('AI analysis defaultDepth must be basic, detailed, or comprehensive');
  }

  if (ai.analysis.contextWindowHours <= 0) {
    errors.push('AI analysis contextWindowHours must be positive');
  }

  if (ai.analysis.maxRetryAttempts < 0) {
    errors.push('AI analysis maxRetryAttempts must be non-negative');
  }

  if (ai.analysis.retryDelayMs <= 0) {
    errors.push('AI analysis retryDelayMs must be positive');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates if the Google AI API key format is correct
 */
export function validateGoogleAIApiKey(apiKey?: string): boolean {
  const key = apiKey || config.ai.google.apiKey;

  // Google AI API keys typically start with "AIza" and are 39 characters long
  const googleApiKeyRegex = /^AIza[0-9A-Za-z-_]{35}$/;
  return googleApiKeyRegex.test(key);
}

/**
 * Checks if AI debug mode is enabled
 */
export function isAIDebugEnabled(): boolean {
  return config.ai.debug.enabled;
}

/**
 * Gets the effective AI budget limit based on current configuration
 */
export function getEffectiveAIBudget(): {
  dailyLimitUSD: number;
  hourlyTokenLimit: number;
  minuteRequestLimit: number;
} {
  return {
    dailyLimitUSD: config.ai.budget.maxCostPerDay,
    hourlyTokenLimit: config.ai.budget.maxTokensPerHour,
    minuteRequestLimit: config.ai.budget.maxRequestsPerMinute,
  };
}

/**
 * Gets AI cache TTL for a specific analysis type
 */
export function getAICacheTTL(
  analysisType: 'sentiment' | 'technical' | 'risk' | 'default'
): number {
  const { cache } = config.ai;
  switch (analysisType) {
    case 'sentiment':
      return cache.sentimentTTL;
    case 'technical':
      return cache.technicalTTL;
    case 'risk':
      return cache.riskTTL;
    default:
      return cache.defaultTTL;
  }
}

/**
 * Checks if an AI operation should be allowed based on current configuration
 */
export function isAIOperationAllowed(riskLevel: 'low' | 'medium' | 'high'): boolean {
  const riskLevels = ['low', 'medium', 'high'];
  const maxRiskIndex = riskLevels.indexOf(config.ai.risk.maxRiskLevel);
  const operationRiskIndex = riskLevels.indexOf(riskLevel);

  return operationRiskIndex <= maxRiskIndex;
}

/**
 * Gets environment-specific AI configuration overrides
 */
export function getEnvironmentAIOverrides(): Partial<AIConfig> {
  if (isDevelopment()) {
    return {
      debug: {
        ...config.ai.debug,
        enabled: true,
        logRequests: true,
        logLevel: 'debug',
      },
      budget: {
        ...config.ai.budget,
        maxCostPerDay: 1.0, // Lower budget for development
      },
    };
  }

  if (isProduction()) {
    return {
      debug: {
        ...config.ai.debug,
        enabled: false,
        logRequests: false,
        logLevel: 'error',
      },
      risk: {
        ...config.ai.risk,
        enableSafetyValidation: true,
        enableContentFilter: true,
      },
    };
  }

  return {};
}
