import { JsonSchema } from 'json-schema-library';
import { isEmpty } from 'lodash/fp';

import { OptionRequirements, UserOptions } from '../types';
import generateIndividualOptionsSchema from './generateIndividualOptionsSchema';
import generateOrOptionsSchemas from './generateOrOptionsSchemas';
import generateIfOptionsSchemas from './generateIfOptionsSchemas';

const generateOptionRequirementsSchema = (
  userOptions: UserOptions,
  optionRequirements: OptionRequirements
): JsonSchema => {
  const individualOptionsSchema: JsonSchema = generateIndividualOptionsSchema(
    userOptions,
    optionRequirements
  );

  const orOptionsSchemas: JsonSchema = generateOrOptionsSchemas(
    userOptions,
    optionRequirements
  );

  const ifOptionSchemas: JsonSchema = generateIfOptionsSchemas(
    userOptions,
    optionRequirements
  );

  const OptionRequirementsSchema: JsonSchema = {
    type: 'object',
    ...(!isEmpty(individualOptionsSchema) && { properties: individualOptionsSchema }),
    ...((!isEmpty(orOptionsSchemas) || !isEmpty(ifOptionSchemas)) && {
      allOf: orOptionsSchemas.concat(ifOptionSchemas)
    })
  };

  return OptionRequirementsSchema;
};

export default generateOptionRequirementsSchema;
