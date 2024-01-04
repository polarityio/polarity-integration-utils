import { JsonError } from 'json-schema-library';
import { OptionValidationError } from './types';

const translateJsonSchemaErrorsToValidationErrors = (
  jsonSchemaErrors: JsonError[]
): OptionValidationError[] => {
  //TODO - Using the option `key` property and `message` property, parse JSON Schema errors into { key, message } errors
  return [];
};

export default translateJsonSchemaErrorsToValidationErrors;
