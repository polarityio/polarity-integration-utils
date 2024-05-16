/**
 * For backwards compatibility this class must remain until we bump to v1.0.0
 */
class RequestError extends Error {
  message: string | undefined;
  status: string | number | undefined;
  description: string | undefined;
  requestOptions: string | undefined;

  constructor(message?: string, status?: string | number, description?: string, requestOptions?: string) {
    super();
    this.message = `Request Error${
      message ? ` -> ${message}` : ''
    }`;
    this.status = status;
    this.description = description;
    this.requestOptions = requestOptions;
  }
}

export default RequestError;
