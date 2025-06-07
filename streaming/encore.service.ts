import { Service } from 'encore.dev/service';
import { burstProtection, streamingRateLimit } from '../shared/middleware/rate-limiting.js';
import { securityHeaders, validateApiVersion } from '../shared/middleware/validation.js';

export default new Service('streaming', {
  middlewares: [securityHeaders, validateApiVersion, streamingRateLimit, burstProtection],
});
