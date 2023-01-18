const fs = require('fs');
const request = require('postman-request');
const { getLogger } = require('./logger');
const { NetworkError } = require('./errors');
const {
  request: { ca, cert, key, passphrase, rejectUnauthorized, proxy }
} = require('../config/config.js');
const { get, map, T } = require('lodash/fp');
const { parallelLimit } = require('async');

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
  constructor (runRequestsInParallel = false) {
    this.requestWithDefaults = request.defaults(defaults);
    this.runRequestsInParallel = runRequestsInParallel;
  }
  /**
   * Makes a request network request using postman-request.  If the request is an array, it will run the requests in parallel.
   * @param requestOptions - the request options to pass to postman-request
   * @returns {{Promise<*>} || {Promise<Array<*>>}}- returns a promise that resolves to the response from the request
   */
  async request (requestOptions) {
    const Logger = getLogger();
    Logger.trace({ requestOptions }, 'making parallel request');

    // if we are passed an array of requests, we run them in parallel.
    if (this.runRequestsInParallel) {
      return this.runRequestsInParallel(requestOptions);
    }

    //the requestOptions will always be an array, even if it is only one request.
    // we just spread it out into an object for a single request that wont be ran in parallel.
    return new Promise(async (resolve, reject) => {
      this.requestWithDefaults({ ...requestOptions }, (err, response) => {
        Logger.trace({ requestOptions }, 'request complete');
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

  // need multiple requests to be made in parallel
  async runRequestsInParallel (requestsOptions, limit = 10) {
    const Logger = getLogger();

    Logger.trace({ requestsOptions }, 'Parallel Requests');

    const unexecutedRequestFunctions = map(
      (singleRequestOptions) => async () => {
        const result = await this.request(singleRequestOptions);
        return result;
      },
      requestsOptions
    );

    return parallelLimit(unexecutedRequestFunctions, limit);
  }
}

class AuthenticatedPolarityRequest extends PolarityRequest {
  constructor () {
    super();
  }
  /**
   * @param  options, {{options: Object, headers: {[authKey]: string}}} - the request options to pass to postman-request
   */
  setRequestHeadersAndOptions (options) {
    this.authorizedRequestOptions = {
      url: options.domain,
      headers: { ...options.headers }
    };
  }
  // method, and path need to be added to a single request or multiple requests
  addHeadersAndOptionsForMultipleRequests (requestOptions) {
    return map((option) => {
      return {
        method: option.method,
        url: this.authorizedRequestOptions.url + option.path,
        headers: this.authorizedRequestOptions.headers,
        ...(get('body', option) && { body: option.body })
      };
    }, requestOptions);
  }

  async makeAuthenticatedRequest (requestOptions) {
    const Logger = getLogger();
    // if a single request, is passed, just put the request object in an array
    if (!Array.isArray(requestOptions)) {
      requestOptions = [requestOptions];
    }

    Object.assign(
      requestOptions,
      this.addHeadersAndOptionsForMultipleRequests(requestOptions)
    );

    Logger.trace({ requestOptions }, 'adsas');
    return super.request(requestOptions);
  }
}

module.exports = {
  polarityRequest: new PolarityRequest(),
  authenticatedPolarityRequest: new AuthenticatedPolarityRequest()
};
