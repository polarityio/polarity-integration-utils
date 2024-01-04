import { JsonSchema } from 'json-schema-library';
import { map, filter, first } from 'lodash/fp';

import {
  ConditionalOptionRequirement,
  ConditionalOptionValidation,
  OptionRequirement,
  OptionRequirements,
  UserOptions
} from '../types';
import generateIndividualOptionsSchema from './generateIndividualOptionsSchema';
import generateOrOptionsSchemas from './generateOrOptionsSchemas';

const generateIfOptionsSchemas = (
  userOptions: UserOptions,
  optionRequirements: OptionRequirements
): JsonSchema => {
  const ifOptionRequirements: OptionRequirements = filter(
    (optionRequirement: OptionRequirement): boolean => {
      if (typeof optionRequirement === 'string') return false;
      return 'if' in optionRequirement;
    },
    optionRequirements
  );

  const anyOfSchemaRequirements: JsonSchema = map(
    (ifOptionRequirement: OptionRequirement): JsonSchema => {
      if (
        typeof ifOptionRequirement === 'string' ||
        'option' in ifOptionRequirement ||
        'or' in ifOptionRequirement
      )
        return {};

      const jsonSchemaForThisOption: JsonSchema = {
        if: generateIfCondition(userOptions, ifOptionRequirement.if),
        ...(ifOptionRequirement.then && {
          then: {
            properties: generateIndividualOptionsSchema(userOptions, [
              ifOptionRequirement.then
            ])
          }
        }),
        ...(ifOptionRequirement.else && {
          else: {
            properties: generateIndividualOptionsSchema(userOptions, [
              ifOptionRequirement.else
            ])
          }
        })
      };

      return jsonSchemaForThisOption;
    },
    ifOptionRequirements
  );

  return anyOfSchemaRequirements;
};

const generateIfCondition = (
  userOptions: UserOptions,
  ifOptionRequirementItem: ConditionalOptionRequirement
): JsonSchema => {
  if (typeof ifOptionRequirementItem === 'string' || 'option' in ifOptionRequirementItem)
    return {
      properties: generateIndividualOptionsSchema(userOptions, [ifOptionRequirementItem])
    };

  if ('and' in ifOptionRequirementItem)
    return {
      allOf: map(
        (andItem: ConditionalOptionValidation): JsonSchema => ({
          properties: generateIndividualOptionsSchema(userOptions, [andItem])
        }),
        ifOptionRequirementItem.and
      )
    };

  if ('or' in ifOptionRequirementItem)
    return first(generateOrOptionsSchemas(userOptions, [ifOptionRequirementItem]));
};
export default generateIfOptionsSchemas;
