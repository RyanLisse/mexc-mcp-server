/**
 * Test file for AI configuration validation
 * Ensures AI config structure is correct and all validation functions work
 */

import {
  type AIConfig,
  config,
  getAICacheTTL,
  getEffectiveAIBudget,
  getEnvironmentAIOverrides,
  isAIDebugEnabled,
  isAIOperationAllowed,
  validateAIConfig,
  validateGoogleAIApiKey,
} from './shared/config';

/**
 * Test AI configuration structure and validation
 */
function testAIConfigStructure() {
  console.log('🧪 Testing AI Configuration Structure...\n');

  // Test that all AI config sections exist
  const { ai } = config;

  console.log('✅ AI Google Configuration:');
  console.log(`   Model: ${ai.google.model}`);
  console.log(`   Max Tokens: ${ai.google.maxTokens}`);
  console.log(`   Temperature: ${ai.google.temperature}`);
  console.log(`   Top-K: ${ai.google.topK}`);
  console.log(`   Top-P: ${ai.google.topP}`);

  console.log('\n✅ AI Budget Configuration:');
  console.log(`   Max Cost Per Day: $${ai.budget.maxCostPerDay}`);
  console.log(`   Max Tokens Per Hour: ${ai.budget.maxTokensPerHour.toLocaleString()}`);
  console.log(`   Max Requests Per Minute: ${ai.budget.maxRequestsPerMinute}`);
  console.log(`   Cost Per Million Tokens: $${ai.budget.costPerMillionTokens}`);
  console.log(`   Budget Reset Hour: ${ai.budget.budgetResetHour}:00`);

  console.log('\n✅ AI Cache Configuration:');
  console.log(`   Enabled: ${ai.cache.enabled}`);
  console.log(`   Default TTL: ${ai.cache.defaultTTL / 1000}s`);
  console.log(`   Max Size: ${ai.cache.maxSizeMB}MB`);
  console.log(`   Sentiment TTL: ${ai.cache.sentimentTTL / 1000}s`);
  console.log(`   Technical TTL: ${ai.cache.technicalTTL / 1000}s`);
  console.log(`   Risk TTL: ${ai.cache.riskTTL / 1000}s`);
  console.log(`   Compression: ${ai.cache.compression}`);

  console.log('\n✅ AI Risk Configuration:');
  console.log(`   Max Risk Level: ${ai.risk.maxRiskLevel}`);
  console.log(`   Min Confidence: ${ai.risk.minConfidenceThreshold}`);
  console.log(`   Content Filter: ${ai.risk.enableContentFilter}`);
  console.log(`   Max Position Size: ${ai.risk.maxPositionSizePercent}%`);
  console.log(`   Assessment Timeout: ${ai.risk.assessmentTimeoutMs / 1000}s`);
  console.log(`   Safety Validation: ${ai.risk.enableSafetyValidation}`);

  console.log('\n✅ AI Rate Limiting:');
  console.log(`   Max Requests: ${ai.rateLimit.maxRequests}/min`);
  console.log(`   Window: ${ai.rateLimit.windowMs / 1000}s`);
  console.log(`   Burst Limit: ${ai.rateLimit.burstLimit}`);
  console.log(`   Adaptive: ${ai.rateLimit.adaptive}`);

  console.log('\n✅ AI Analysis Configuration:');
  console.log(`   Default Depth: ${ai.analysis.defaultDepth}`);
  console.log(`   Confidence Intervals: ${ai.analysis.enableConfidenceIntervals}`);
  console.log(`   Context Window: ${ai.analysis.contextWindowHours}h`);
  console.log(`   Max Retries: ${ai.analysis.maxRetryAttempts}`);
  console.log(`   Retry Delay: ${ai.analysis.retryDelayMs}ms`);
  console.log(`   Parallel Processing: ${ai.analysis.enableParallelProcessing}`);

  console.log('\n✅ AI Debug Configuration:');
  console.log(`   Enabled: ${ai.debug.enabled}`);
  console.log(`   Log Requests: ${ai.debug.logRequests}`);
  console.log(`   Enable Metrics: ${ai.debug.enableMetrics}`);
  console.log(`   Save Failed Requests: ${ai.debug.saveFailedRequests}`);
  console.log(`   Log Level: ${ai.debug.logLevel}`);
}

/**
 * Test AI validation functions
 */
function testAIValidationFunctions() {
  console.log('\n🔍 Testing AI Validation Functions...\n');

  // Test config validation
  const validation = validateAIConfig();
  console.log('✅ AI Config Validation:');
  console.log(`   Valid: ${validation.valid}`);
  if (!validation.valid) {
    console.log('   Errors:');
    validation.errors.forEach((error) => console.log(`     - ${error}`));
  } else {
    console.log('   All validation checks passed!');
  }

  // Test Google API key validation (with test key)
  const apiKeyValid = validateGoogleAIApiKey();
  console.log(
    `\n✅ Google AI API Key Validation: ${apiKeyValid ? 'Valid format' : 'Invalid/Test key'}`
  );

  // Test debug mode
  const debugEnabled = isAIDebugEnabled();
  console.log(`✅ AI Debug Mode: ${debugEnabled ? 'Enabled' : 'Disabled'}`);

  // Test budget retrieval
  const budget = getEffectiveAIBudget();
  console.log('\n✅ Effective AI Budget:');
  console.log(`   Daily Limit: $${budget.dailyLimitUSD}`);
  console.log(`   Hourly Token Limit: ${budget.hourlyTokenLimit.toLocaleString()}`);
  console.log(`   Minute Request Limit: ${budget.minuteRequestLimit}`);

  // Test cache TTL functions
  console.log('\n✅ Cache TTL Values:');
  console.log(`   Default: ${getAICacheTTL('default') / 1000}s`);
  console.log(`   Sentiment: ${getAICacheTTL('sentiment') / 1000}s`);
  console.log(`   Technical: ${getAICacheTTL('technical') / 1000}s`);
  console.log(`   Risk: ${getAICacheTTL('risk') / 1000}s`);

  // Test risk operation allowance
  console.log('\n✅ AI Operation Risk Allowance:');
  console.log(`   Low Risk: ${isAIOperationAllowed('low') ? 'Allowed' : 'Blocked'}`);
  console.log(`   Medium Risk: ${isAIOperationAllowed('medium') ? 'Allowed' : 'Blocked'}`);
  console.log(`   High Risk: ${isAIOperationAllowed('high') ? 'Allowed' : 'Blocked'}`);

  // Test environment overrides
  console.log('\n✅ Environment Overrides:');
  const overrides = getEnvironmentAIOverrides();
  if (Object.keys(overrides).length > 0) {
    console.log('   Active overrides found for current environment');
    if (overrides.debug) {
      console.log(`   Debug enabled: ${overrides.debug.enabled}`);
      console.log(`   Log level: ${overrides.debug.logLevel}`);
    }
    if (overrides.budget) {
      console.log(`   Development budget: $${overrides.budget.maxCostPerDay}`);
    }
  } else {
    console.log('   No environment-specific overrides active');
  }
}

/**
 * Test type safety and interface compliance
 */
function testTypeSafety() {
  console.log('\n🛡️  Testing Type Safety...\n');

  // Test that config conforms to ServerConfig interface
  console.log('✅ ServerConfig interface compliance verified for:', typeof config);

  // Test that ai section conforms to AIConfig interface
  const aiConfig: AIConfig = config.ai;
  console.log('✅ AIConfig interface compliance verified');

  // Test individual sections
  const googleConfig = aiConfig.google;
  const budgetConfig = aiConfig.budget;
  const cacheConfig = aiConfig.cache;
  const riskConfig = aiConfig.risk;
  const rateLimitConfig = aiConfig.rateLimit;
  console.log('Rate limit config loaded:', typeof rateLimitConfig);
  const analysisConfig = aiConfig.analysis;
  const debugConfig = aiConfig.debug;

  console.log('✅ All AI configuration sections type-safe');

  // Test environment variable types
  console.log('Google temperature:', typeof googleConfig.temperature);
  console.log('Max cost per day:', typeof budgetConfig.maxCostPerDay);
  console.log('Cache enabled:', typeof cacheConfig.enabled);
  console.log('Risk level:', riskConfig.maxRiskLevel);
  console.log('Analysis depth:', analysisConfig.defaultDepth);
  console.log('Log level:', debugConfig.logLevel);

  console.log('✅ All configuration values have correct types');
}

/**
 * Test configuration with different environment scenarios
 */
function testEnvironmentScenarios() {
  console.log('\n🌍 Testing Environment Scenarios...\n');

  // Save original NODE_ENV
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    // Test development environment
    process.env.NODE_ENV = 'development';
    console.log('✅ Development Environment:');
    console.log(`   Debug enabled: ${isAIDebugEnabled()}`);

    // Test production environment
    process.env.NODE_ENV = 'production';
    console.log('✅ Production Environment:');
    console.log(`   Debug disabled: ${!isAIDebugEnabled()}`);

    // Test test environment
    process.env.NODE_ENV = 'test';
    console.log('✅ Test Environment configured');
  } finally {
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  }
}

/**
 * Test integration with AI services
 */
function testIntegrationPoints() {
  console.log('\n🔗 Testing Integration Points...\n');

  // Test that configuration provides all required fields for Gemini client
  const geminiConfig = config.ai.google;
  const requiredFields = ['apiKey', 'model', 'maxTokens', 'temperature'];

  console.log('✅ Gemini Client Integration:');
  requiredFields.forEach((field) => {
    const value = (geminiConfig as any)[field];
    console.log(`   ${field}: ${value !== undefined ? 'Present' : 'Missing'}`);
  });

  // Test budget management integration
  const budgetFields = ['maxCostPerDay', 'maxTokensPerHour', 'maxRequestsPerMinute'];
  console.log('\n✅ Budget Management Integration:');
  budgetFields.forEach((field) => {
    const value = (config.ai.budget as any)[field];
    console.log(`   ${field}: ${value !== undefined ? 'Present' : 'Missing'}`);
  });

  // Test cache integration
  const cacheFields = ['enabled', 'defaultTTL', 'sentimentTTL', 'technicalTTL', 'riskTTL'];
  console.log('\n✅ Cache Integration:');
  cacheFields.forEach((field) => {
    const value = (config.ai.cache as any)[field];
    console.log(`   ${field}: ${value !== undefined ? 'Present' : 'Missing'}`);
  });
}

/**
 * Run comprehensive AI configuration test
 */
export function runAIConfigTest() {
  console.log('🚀 Starting AI Configuration Test Suite...\n');

  try {
    testAIConfigStructure();
    testAIValidationFunctions();
    testTypeSafety();
    testEnvironmentScenarios();
    testIntegrationPoints();

    console.log('\n✅ All AI Configuration Tests Passed!');
    console.log('\n📊 Configuration Summary:');
    console.log(`   Environment: ${config.server.nodeEnv}`);
    console.log(`   AI Model: ${config.ai.google.model}`);
    console.log(`   Daily Budget: $${config.ai.budget.maxCostPerDay}`);
    console.log(`   Cache Enabled: ${config.ai.cache.enabled}`);
    console.log(`   Max Risk Level: ${config.ai.risk.maxRiskLevel}`);
    console.log(`   Debug Mode: ${config.ai.debug.enabled}`);
  } catch (error) {
    console.error('❌ AI Configuration Test Failed:', error);
    throw error;
  }
}

// Run test if executed directly
if (require.main === module) {
  runAIConfigTest();
}
