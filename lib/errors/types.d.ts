import type { RequestOptions } from '../requests/types';
import type IntegrationError from './integrationError';

export interface Error {
  name: string;
  message: string;
  stack?: string;
  code?: number | string;
}

export type ErrorMeta = {
  [otherMetadata: string]: unknown;
};

type MetaObject = {
  // Allows any key-value pairs
  [key: string]: any; 
};

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
  requestOptions?: RequestOptions;
  /**
   * Any additional properties which will be appended to the Error's meta property
   */
  meta?: MetaObject;
}

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
  requestOptions?: RequestOptions;
  /**
   * an optional  meta object containing non-standard meta-information about the error.
   */
  meta?: ErrorMeta;
}
