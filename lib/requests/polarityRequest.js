const fs = require('fs');
const request = require('postman-request');
const { getLogger } = require('./logger');
const { NetworkError } = require('./errors');
const {
  request: { ca, cert, key, passphrase, rejectUnauthorized, proxy }
} = require('../config/config.js');
const { get } = require('lodash/fp');

const _configFieldIsValid = (field) => typeof field === 'string' && field.length > 0;

const defaults = {
  ...(_configFieldIsValid(ca) && { ca: fs.readFileSync(ca) }),
  ...(_configFieldIsValid(cert) && { cert: fs.readFileSync(cert) }),
  ...(_configFieldIsValid(key) && { key: fs.readFileSync }),
  ...(_configFieldIsValid(passphrase) && { passphrase }),
  ...(_configFieldIsValid(proxy) && { proxy }),
  ...(typeof rejectUnauthorized === 'boolean' && { rejectUnauthorized }),
  json: true
};

class PolarityRequest {
  constructor () {
    this.requestWithDefaults = request.defaults(defaults);
  }

  async request (requestOptions) {
    return new Promise(async (resolve, reject) => {
      this.requestWithDefaults(requestOptions, (err, response) => {
        if (err) {
          return reject(
            new NetworkError('Unable to complete network request', {
              cause: err,
              requestOptions
            })
          );
        }

        resolve({
          ...response,
          requestOptions
        });
      });
    });
  }
}

class AuthenticatedPolarityRequest extends PolarityRequest {
  setAuthHeaders (options) {
    this.url = options.url;
    this.headers = {
      ...options
    };
  }

  async authenticateRequest (requestOptions) {
    const authenticatedRequestOptions = {
      method: requestOptions.method,
      url: this.url + requestOptions.path,
      headers: this.headers,
      ...(get('body', requestOptions) && { body: requestOptions.body })
    };

    return super.request(authenticatedRequestOptions);
  }
}

module.exports = {
  polarityRequest: new PolarityRequest(),
  authenticatedPolarityRequest: new AuthenticatedPolarityRequest()
};
