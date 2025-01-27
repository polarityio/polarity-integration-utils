/**
 * @public
 */
export type ValidationError = {
  key: string;
  message: string;
};

/**
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
