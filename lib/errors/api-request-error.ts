import { IntegrationError, type IntegrationErrorProperties } from './integration-error';

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
