import { Draft, Draft07, JsonError, JsonSchema } from 'json-schema-library';
import { OptionValidationError, UserOptions } from './types';
import translateJsonSchemaErrorsToValidationErrors from './translateJsonSchemaErrorsToValidationErrors';

const validateOptionsUsingGeneratedSchema = (
  userOptions: UserOptions,
  generatedOptionRequirementsSchema: JsonSchema
): OptionValidationError[] => {
  const jsonSchema: Draft = new Draft07(generatedOptionRequirementsSchema);
  const jsonSchemaErrors: JsonError[] = jsonSchema.validate(userOptions);

  const validationErrors: OptionValidationError[] =
    translateJsonSchemaErrorsToValidationErrors(jsonSchemaErrors);

  return validationErrors;
};

export default validateOptionsUsingGeneratedSchema;
