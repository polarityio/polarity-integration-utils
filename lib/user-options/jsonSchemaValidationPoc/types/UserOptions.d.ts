export type UserOptions = {
  [key: string]: UserOption;
};

export type UserOption = ValidateOptionsUserOption & {
  name: string,
  type: PossibleOptionType;
  multiple?: boolean
};

export type ConfigUserOptions = ConfigUserOption[]

export type ConfigUserOption = {
  key: string;
  name: string;
  description: string;
  type: PossibleOptionType;
  default: PossibleFieldValue;
  options?: DropdownOption[];
  multiple?: boolean;
  user_can_edit?: boolean;
  admin_only?: boolean;
};

export type ValidateOptionsUserOptions = {
  [key: string]: ValidateOptionsUserOption;
};

export type ValidateOptionsUserOption = {
  integration_id?: string;
  key: string;
  value: PossibleFieldValue;
  user_can_edit?: boolean;
  admin_only?: boolean;
};

export type PossibleOptionType = 'text' | 'password' | 'number' | 'boolean' | 'select';
type PossibleFieldValue = undefined | string | number | boolean | DropdownOption | DropdownOption[];

type DropdownOption = {
  display: string;
  value: string;
};

export default UserOptions;
