import IntegrationError from './integrationError';
import type { IntegrationErrorProperties } from './types';

/**
 * API error for REST requests
 */
class ApiRequestError extends IntegrationError {
  constructor(message, properties: IntegrationErrorProperties = {}) {
    super(message, properties);
  }
}

export default ApiRequestError;
