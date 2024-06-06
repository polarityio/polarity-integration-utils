export type Entity = {
  value: string;
  types: EntityType[];
  type: EntityType;
  requestContext: { requestType: 'onDemand'; isUserInitiated: boolean };
  longitude: number;
  latitude: number;
  isURL: boolean;
  isSHA512: boolean;
  isSHA256: boolean;
  isSHA1: boolean;
  isPrivateIP: boolean;
  isMD5: boolean;
  isIPv6: boolean;
  isIPv4: boolean;
  isIP: boolean;
  isHex: boolean;
  isHash: boolean;
  isHTMLTag: boolean;
  isEmail: true;
  isDomain: boolean;
  hashType: string;
  displayValue: string;
  channels: string[];
  IPType: string;
};

export type EntityType =
  | StandardEntityType
  | '*'
  | 'custom'
  | `custom.${string}`;

export type StandardEntityType =
  | 'IP'
  | 'IPv4'
  | 'IPv4CIDR'
  | 'IPv6'
  | 'MAC'
  | 'MD5'
  | 'SHA1'
  | 'SHA256'
  | 'cve'
  | 'domain'
  | 'email'
  | 'hash'
  | 'string'
  | 'url';
