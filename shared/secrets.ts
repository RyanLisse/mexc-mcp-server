import { secret } from 'encore.dev/config';

/**
 * MEXC API credentials managed by Encore.ts secrets
 *
 * To set these secrets:
 *
 * For staging:
 * encore secret set --env=staging MEXC_API_KEY "your_api_key"
 * encore secret set --env=staging MEXC_SECRET_KEY "your_secret_key"
 *
 * For production:
 * encore secret set --env=production MEXC_API_KEY "your_api_key"
 * encore secret set --env=production MEXC_SECRET_KEY "your_secret_key"
 */

// MEXC API credentials
export const mexcApiKey = secret('MEXC_API_KEY');
export const mexcSecretKey = secret('MEXC_SECRET_KEY');

/**
 * Get MEXC API credentials
 * @returns Object with API key and secret key
 */
export function getMexcCredentials() {
  return {
    apiKey: mexcApiKey(),
    secretKey: mexcSecretKey(),
  };
}

/**
 * Check if MEXC credentials are configured
 * @returns Boolean indicating if credentials are available
 */
export function hasMexcCredentials(): boolean {
  try {
    const apiKey = mexcApiKey();
    const secretKey = mexcSecretKey();
    return !!(apiKey && secretKey);
  } catch (_error) {
    return false;
  }
}
