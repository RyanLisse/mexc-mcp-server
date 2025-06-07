import { Service } from 'encore.dev/service';
import { adaptiveRateLimit } from '../shared/middleware/rate-limiting.js';
import {
  authRateLimit,
  registrationRateLimit,
  securityHeaders,
  validateContentType,
} from '../shared/middleware/validation.js';

export default new Service('user', {
  middlewares: [
    securityHeaders,
    validateContentType,
    authRateLimit,
    registrationRateLimit,
    adaptiveRateLimit,
  ],
});
