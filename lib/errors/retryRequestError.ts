import IntegrationError from './integrationError';
import type { IntegrationErrorProperties } from './types';

/**
 * Thrown by authenticated request method for any HTTP status codes where we want to allow
 * the user to retry their lookup.
 */
class RetryRequestError extends IntegrationError {
  constructor(message, properties: IntegrationErrorProperties = {}) {
    super(message, properties);
  }
}

export default RetryRequestError;