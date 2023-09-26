const decodeBase64 = (str) => str && Buffer.from(str, 'base64').toString('ascii');

export default decodeBase64;
