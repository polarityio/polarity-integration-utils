/**
 * @public
 * @param str - string to encode into base64
 */
export const encodeBase64 = (str) => str && Buffer.from(str).toString('base64');