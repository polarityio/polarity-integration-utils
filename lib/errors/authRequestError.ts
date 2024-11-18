import IntegrationError from './integrationError';
import type { IntegrationErrorProperties } from './errors';

/**
 * Thrown by generateAccessToken method if there is a failure to fetch a token
 */
class AuthRequestError extends IntegrationError {
  constructor(message, properties: IntegrationErrorProperties = {}) {
    super(message, properties);
  }
}

export default AuthRequestError;