import IntegrationError from './integrationError';

/**
 * API error for REST requests
 */
class ApiRequestError extends IntegrationError {
  constructor(message, properties = {}) {
    super(message, properties);
  }
}

export default ApiRequestError;