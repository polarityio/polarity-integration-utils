import { JsonSchema } from 'json-schema-library';
import {
  ConfigUserOptions,
  OptionRequirements,
  OptionValidationError,
  UserOptions,
  ValidateOptionsUserOptions
} from './types';

import addTypeToValidateOptions from './addTypeToValidateOptions';
import generateOptionRequirementsSchema from './generateOptionRequirementsSchema';
import validateOptionsUsingGeneratedSchema from './validateOptionsUsingGeneratedSchema';
import validateOptionRequirements from './validateOptionRequirements';

const validateOptionsUsingOptionRequirements = (
  configUserOptions: ConfigUserOptions,
  validateOptionsUserOptions: ValidateOptionsUserOptions,
  optionRequirements: OptionRequirements
): OptionValidationError[] => {
  validateOptionRequirements(configUserOptions, optionRequirements);

  const userOptions: UserOptions = addTypeToValidateOptions(
    configUserOptions,
    validateOptionsUserOptions
  );

  const generatedOptionRequirementsSchema: JsonSchema = generateOptionRequirementsSchema(
    userOptions,
    optionRequirements
  );

  const validationErrors: OptionValidationError[] = validateOptionsUsingGeneratedSchema(
    userOptions,
    generatedOptionRequirementsSchema
  );

  return validationErrors;
};

export default validateOptionsUsingOptionRequirements;
