import { IntegrationError, type IntegrationErrorProperties } from './integrationError';

/**
 * API error for REST requests
 * 
 * @public
 */
export class ApiRequestError extends IntegrationError {
  constructor(message: string, properties: IntegrationErrorProperties = {}) {
    super(message, properties);
  }
}
