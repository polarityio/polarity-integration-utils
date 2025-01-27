import { IntegrationError, type IntegrationErrorProperties } from './integrationError';

/**
 * Thrown by generateAccessToken method if there is a failure to fetch a token
 *
 * @public
 */
export class AuthRequestError extends IntegrationError {
  constructor(message: string, properties: IntegrationErrorProperties = {}) {
    super(message, properties);
  }
}
