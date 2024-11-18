import parseErrorToReadableJson from './parseErrorToReadableJson';
import type { ErrorMeta, IntegrationErrorProperties, SerializedIntegrationError } from './types';
import type { RequestOptions } from '../requests/requests';

class IntegrationError extends Error {
  /**
   *  a short, human-readable summary of the problem that SHOULD NOT change from occurrence to occurrence of
   *  the problem except for purposes of localization.
   */
  readonly title: string;

  /**
   * a human-readable explanation specific to this occurrence of the problem. Like title, this field’s value can be
   * localized
   */
  readonly detail: string;

  /**
   * a meta object containing non-standard meta-information about the error.
   */
  readonly meta: ErrorMeta;

  /**
   * The HTTP status code applicable to this error, expressed as a string value.
   */
  readonly status: string;

  /**
   *  an application-specific error code, expressed as a string value.
   */
  readonly code: string;

  /**
   * The `cause` property is used to specify the `cause` of the error.  Typically,
   * this property is used to pass through a related Error instance.
   */
  readonly cause: Error;
  /**
   * Additional details related to the error that may help the user troubleshoot the issue.  If set by the user
   * via the Error constructor, the user provided value will override any automated help message set by the
   * Error class.
   */
  readonly help: string;
  /**
   * Relevant for integration errors involving a network call, the `requestOptions` property
   * details the request options that resulted in the specified error.  The `requestOptions` property will automatically
   * have sensitive authentication headers stripped.
   */
  readonly requestOptions?: RequestOptions;

  /**
   * Construct a new IntegrationError object.
   *
   * @param message {string} - A string description of the error which is used as the `detail` property on the
   * serialized error.
   * @param properties {IntegrationErrorProperties} - Optional properties for the error.
   */
  constructor(message, properties: IntegrationErrorProperties = {}) {
    super(message);

    this.title = properties.title || this.constructor.name;
    this.detail = message;
    this.name = this.constructor.name;

    if (typeof properties.code !== 'undefined') {
      this.code = properties.code;
    }

    if (typeof properties.status !== 'undefined') {
      this.status = properties.status;
    }

    if (properties.cause && properties.cause instanceof Error) {
      this.cause = properties.cause;
    }

    if (typeof properties.requestOptions !== 'undefined') {
      this.requestOptions = this.sanitizeRequestOptions(properties.requestOptions);
    }

    if (typeof properties.help !== 'undefined') {
      this.help = properties.help;
    }

    if (typeof properties.meta !== 'undefined') {
      this.meta = {
        ...properties.meta
      };
    }
  }

  /**
   * Given a postman-request options object, will return a sanitized object with basic auth and Authorization headers
   * removed.
   *
   * TODO: Come up with a more robust way to detect secrets and obscure them
   *
   * @param requestOptions
   * @returns {*}
   */
  sanitizeRequestOptions(requestOptions) {
    const sanitizedOptions = {
      ...requestOptions
    };

    if (sanitizedOptions.headers) {
      // case insensitive header lookup
      // Note that if two headers are set that are the same but with different casing
      // this method will not sanitize both headers
      const headerLookup = Object.keys(sanitizedOptions.headers).reduce((accum, header) => {
        accum[header.toLowerCase()] = header;
        return accum;
      }, {});

      if (headerLookup['authorization']) {
        sanitizedOptions.headers[headerLookup['authorization']] = '**********';
      }

      if (headerLookup['x-api-key']) {
        sanitizedOptions.headers[headerLookup['x-api-key']] = '**********';
      }
    }

    if (sanitizedOptions.auth && sanitizedOptions.auth.password) {
      sanitizedOptions.auth.password = '**********';
    }

    if (sanitizedOptions.auth && sanitizedOptions.auth.bearer) {
      sanitizedOptions.auth.bearer = '**********';
    }

    if (sanitizedOptions.body && sanitizedOptions.body.password) {
      sanitizedOptions.body.password = '**********';
    }

    if (sanitizedOptions.form && sanitizedOptions.form.client_secret) {
      sanitizedOptions.form.client_secret = '**********';
    }

    return sanitizedOptions;
  }

  /**
   * Serializes the error's properties into a POJO.  The order of the
   * properties is preserved when serialized.
   *
   * @returns {{name: string, detail: string}}
   */
  toJSON() {
    let props: SerializedIntegrationError = {
      name: this.name,
      detail: this.detail,
      title: this.title
    };

    if (this.stack) {
      props.stack = this.stack;
    }

    if (this.code) {
      props.code = this.code;
    }

    if (this.status) {
      props.status = this.status;
    }

    if (this.help) {
      props.help = this.help;
    }

    if (this.cause) {
      props.cause = parseErrorToReadableJson(this.cause);
    }

    if (this.requestOptions) {
      props.requestOptions = this.requestOptions;
    }

    if (this.meta && Object.keys(this.meta).length > 0) {
      props.meta = this.meta;
    }

    return props;
  }
}

export default IntegrationError;
