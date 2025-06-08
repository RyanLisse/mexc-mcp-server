import { Service } from 'encore.dev/service';
import {
  adaptiveRateLimit,
  authRateLimit,
  registrationRateLimit,
} from '../shared/middleware/rate-limiting.js';
import { securityHeaders, validateContentType } from '../shared/middleware/validation.js';

export default new Service('user', {
  middlewares: [
    securityHeaders,
    validateContentType,
    authRateLimit,
    registrationRateLimit,
    adaptiveRateLimit,
  ],
});
