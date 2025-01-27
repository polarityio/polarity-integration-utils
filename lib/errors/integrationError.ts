import { parseErrorToReadableJson } from './parseErrorToReadableJson';
import type { HttpRequestOptions } from '../requests/polarityRequest';

/**
 * @public
 */
export interface Error {
  name: string;
  message: string;
  stack?: string;
  code?: number | string;
}

/**
 * @public
 */
export type ErrorMeta = {
  [otherMetadata: string]: unknown;
};

/**
 * @public
 */
export type MetaObject = {
  // Allows any key-value pairs
  [key: string]: unknown;
};

/**
 * @public
 */
export interface IntegrationErrorProperties {
  /**
   *  a short, human-readable summary of the problem that SHOULD NOT change from occurrence to occurrence of
   *  the problem except for purposes of localization.  If omitted, the title will default to the type
   *  of error (e.g., IntegrationError, or ApiRequestError)
   */
  title?: string;
  /**
   * Additional details related to the error that may help the user troubleshoot the issue.  If set by the user
   * via the Error constructor, the user provided value will override any automated help message set by the
   * Error class.
   */
  help?: string;
  /**
   * The `cause` property is used to specify the `cause` of the error.  Typically,
   * this property is used to pass through a related Error instance.
   */
  cause?: Error;
  /**
   * The HTTP status code applicable to this error, expressed as a string value.
   */
  status?: string;
  /**
   *  an application-specific error code, expressed as a string value.
   */
  code?: string;
  /**
   * Relevant for integration errors involving a network call, the `requestOptions` property
   * details the request options that resulted in the specified error.  The `requestOptions` property will automatically
   * have sensitive authentication headers stripped.
   */
  requestOptions?: HttpRequestOptions;
  /**
   * Any additional properties which will be appended to the Error's meta property
   */
  meta?: MetaObject;
}

/**
 * @public
 */
export interface SerializedIntegrationError {
  /**
   *  a short, human-readable summary of the problem that SHOULD NOT change from occurrence to occurrence of
   *  the problem except for purposes of localization.  If omitted, the title will default to the type
   *  of error (e.g., IntegrationError, or ApiRequestError)
   */
  title: string;
  /**
   * The name data property of IntegrationError.prototype is shared by all Error instances.
   * It represents the name for the type of error. For IntegrationError.prototype.name,
   * the initial value is "IntegrationError".
   */
  name: string;
  /**
   * a human-readable explanation specific to this occurrence of the problem. Like title, this field’s value can be
   * localized
   */
  detail: string;
  /**
   * An optional HTTP status code applicable to this error, expressed as a string value.
   */
  status?: string;
  /**
   * Additional details related to the error that may help the user troubleshoot the issue.  If set by the user
   * via the Error constructor, the user provided value will override any automated help message set by the
   * Error class.
   */
  help?: string;
  /**
   * An optional StackTrace of the error
   */
  stack?: string;
  /**
   *  An optional application-specific error code, expressed as a string value.
   */
  code?: number | string;
  /**
   * The `cause` property is used to specify the `cause` of the error.  Typically,
   * this property is used to pass through a related Error instance.
   */
  cause?: Error;
  /**
   * Relevant for integration errors involving a network call, the `requestOptions` property
   * details the request options that resulted in the specified error.  The `requestOptions` property will automatically
   * have sensitive authentication headers stripped.
   */
  requestOptions?: HttpRequestOptions;
  /**
   * an optional  meta object containing non-standard meta-information about the error.
   */
  meta?: ErrorMeta;
}

/**
 * @public
 */
export class IntegrationError extends Error {
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
  readonly requestOptions?: HttpRequestOptions;

  /**
   * Construct a new IntegrationError object.
   * @param message - A string description of the error which is used as the `detail` property on the
   * serialized error.
   * @param properties - Optional properties for the error.
   */
  constructor(message: string, properties: IntegrationErrorProperties = {}) {
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
   * @param requestOptions - Request options object to sanitize 
   * @returns Sanitized requestOptions
   */
  sanitizeRequestOptions(requestOptions: HttpRequestOptions): HttpRequestOptions {
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

    if (sanitizedOptions.auth && 'password' in sanitizedOptions.auth) {
      sanitizedOptions.auth.password = '**********';
    }

    if (sanitizedOptions.auth && 'bearer' in sanitizedOptions.auth) {
      sanitizedOptions.auth.bearer = '**********';
    }

    if (sanitizedOptions.body && 'password' in sanitizedOptions.body) {
      sanitizedOptions.body.password = '**********';
    }

    if (sanitizedOptions.form && 'client_secret' in sanitizedOptions.form) {
      sanitizedOptions.form.client_secret = '**********';
    }

    return sanitizedOptions;
  }

  /**
   * Serializes the error's properties into a POJO.  The order of the
   * properties is preserved when serialized.
   * @returns JSON representation of the error
   */
  toJSON() {
    const props: SerializedIntegrationError = {
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
