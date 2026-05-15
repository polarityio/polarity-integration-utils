import type { Entity, EntityType, EntityTypeIdentifier } from '@polarityio/integration-types';

function toEntityTypeIdentifier(type: EntityType): EntityTypeIdentifier {
  if (type === 'IP') return 'IPv4';
  if (type.startsWith('custom.')) return 'custom';
  return type as EntityTypeIdentifier;
}

/**
 * Creates a mock `Entity` for use in tests.
 *
 * Automatically detects whether the value is a domain or IPv4 address and sets
 * the corresponding boolean flags. All other flags default to `false`.
 *
 * @param type - An `EntityType` string (e.g., `'IPv4'`, `'domain'`, `'MD5'`)
 * @param value - The entity value string
 * @returns A fully populated `Entity` object
 *
 * @example
 * ```typescript
 * const ip = createEntity('IPv4', '8.8.8.8');
 * const domain = createEntity('domain', 'example.com');
 * ```
 *
 * @group Testing
 */
export const createEntity = (type: EntityType, value: string): Entity => {
  const isDomain = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(
    value
  );
  const isIPv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(value);
  const isIPv6 = /^[\da-fA-F:]+$/.test(value) && value.includes(':');

  return {
    value,
    rawValue: value,
    displayValue: value,
    type: toEntityTypeIdentifier(type),
    types: [type],
    isDomain,
    isIPv4,
    isIP: isIPv4 || isIPv6,
    isEmail: false,
    isHash: false,
    isHex: false,
    isHTMLTag: false,
    isIPv6,
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
    IPType: isIPv4 ? 'IPv4' : isIPv6 ? 'IPv6' : '',
    channels: [],
    requestContext: {
      requestType: 'OnDemand',
      isUserInitiated: true
    }
  };
};
