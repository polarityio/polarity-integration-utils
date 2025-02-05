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
