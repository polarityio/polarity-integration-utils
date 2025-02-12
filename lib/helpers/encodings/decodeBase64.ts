/**
 * @public
 * @param str - base64 encoded string to decode
 */
export const decodeBase64 = (str) => str && Buffer.from(str, 'base64').toString('ascii');
