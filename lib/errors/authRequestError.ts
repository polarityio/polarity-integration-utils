import IntegrationError from './integrationError';

/**
 * Thrown by generateAccessToken method if there is a failure to fetch a token
 */
class AuthRequestError extends IntegrationError {
  constructor(message, properties = {}) {
    super(message, properties);
  }
}

export default AuthRequestError;