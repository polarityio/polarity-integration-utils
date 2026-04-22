import type { Entity, EntityType } from '@polarityio/integration-types';

export const createEntity = (type: EntityType, value: string): Entity => {
  const isDomain = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(
    value
  );
  const isIPv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(value);

  return {
    value,
    rawValue: value,
    displayValue: value,
    type: type as Entity['type'],
    types: [type],
    isDomain,
    isIPv4,
    isIP: isIPv4,
    isEmail: false,
    isHash: false,
    isHex: false,
    isHTMLTag: false,
    isIPv6: false,
    isMD5: false,
    isPrivateIP: false,
    isSHA1: false,
    isSHA256: false,
    isSHA512: false,
    isURL: false,
    latitude: 0,
    longitude: 0,
    IPLong: 0,
    hashType: '',
    IPType: isIPv4 ? 'IPv4' : '',
    channels: [],
    requestContext: {
      requestType: 'OnDemand',
      isUserInitiated: true
    }
  };
};
