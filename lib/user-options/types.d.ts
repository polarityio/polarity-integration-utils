export type ValidationError = {
  key: string;
  message: string;
};

export type DoLookupUserOptions = {
  [key: string]: PossibleUserOptionValue;
};

export type ValidateOptionsUserOptions = {
  [key: string]: ValidateOptionsUserOption;
};

export type ValidateOptionsUserOption = {
  integration_id?: string;
  key: string;
  value: PossibleUserOptionValue;
  user_can_edit?: boolean;
  admin_only?: boolean;
};

type PossibleUserOptionValue =
  | undefined
  | string
  | number
  | boolean
  | DropdownUserOptionValue
  | DropdownUserOptionValue[];

type DropdownUserOptionValue = {
  display: string;
  value: string;
};
