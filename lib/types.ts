/**
 * @public
 */
export type ValidationError = {
  key: string;
  message: string;
};

/**
 * User options object passed into the integration's `doLookup` method.
 *
 * @example
 * Example of the user options object passed into `doLookup`
 * ```js
 * function doLookup(entities, options, cb){
 *   // options here is of type DoLookupUserOptions
 * }
 * ```
 *
 * @example
 * As an example, if your integration has a user option with a `key` value of
 * `apiKey` within its `config.json`, the user options object passed into the `doLookup` method would look like:
 * ```json
 * {
 *   "apiKey": "XXXXXXXXXX"
 * }
 * ```
 * @public
 */
export type DoLookupUserOptions = {
  [key: string]: PossibleUserOptionValue;
};

/**
 * @public
 */
export type ValidateOptionsUserOptions = {
  [key: string]: ValidateOptionsUserOption;
};

/**
 * @public
 */
export type ValidateOptionsUserOption = {
  integration_id?: string;
  key: string;
  value: PossibleUserOptionValue;
  user_can_edit?: boolean;
  admin_only?: boolean;
};

/**
 * @public
 */
export type PossibleUserOptionValue =
  | undefined
  | string
  | number
  | boolean
  | DropdownUserOptionValue
  | DropdownUserOptionValue[];

/**
 * @public
 */
export type DropdownUserOptionValue = {
  display: string;
  value: string;
};

/**
 * Represents a Polarity Entity object which is passed to an integration's
 * doLookup method.
 *
 * @public
 */
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
  isEmail: boolean;
  isDomain: boolean;
  hashType: 'md5' | 'sha1' | 'sha256' | 'sha512' | '';
  displayValue: string;
  channels: Channel[];
  IPType: 'IPv4' | 'IPv6' | '';
};

export type Channel = {
  channel_name: string;
  id: number;
};

/**
 * Entity Types including custom types
 * @public
 */
export type EntityType = StandardEntityType | '*' | 'custom' | `custom.${string}`;

/**
 * List of supported entity type values
 * @public
 */
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

export type Result<TDetails = unknown> = {
  entity: Entity;
  displayValue?: string;
  data: {
    summary: string[];
    details: TDetails;
  };
};
