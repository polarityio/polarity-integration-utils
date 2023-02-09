const encodeBase64 = (str) => str && Buffer.from(str).toString('base64');

module.exports = encodeBase64;