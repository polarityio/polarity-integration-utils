import { IntegrationError, type IntegrationErrorProperties } from './integrationError';

/**
 * Thrown by authenticated request method for any HTTP status codes where we want to allow
 * the user to retry their lookup.
 *
 * @public
 */
export class RetryRequestError extends IntegrationError {
  constructor(message: string, properties: IntegrationErrorProperties = {}) {
    super(message, properties);
  }
}
