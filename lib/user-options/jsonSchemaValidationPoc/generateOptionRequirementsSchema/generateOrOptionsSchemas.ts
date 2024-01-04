import { JsonSchema } from 'json-schema-library';
import { map, filter, flow } from 'lodash/fp';

import {
  ConditionalOrRelationshipValidation,
  OptionRequirement,
  OptionRequirements,
  OptionValidation,
  PossibleOrItem,
  UserOptions
} from '../types';
import generateIndividualOptionsSchema from './generateIndividualOptionsSchema';
import getOptionKeysFromOptionRequirement from './getOptionKeysFromOptionRequirement';

const generateOrOptionsSchemas = (
  userOptions: UserOptions,
  optionRequirements: OptionRequirements | ConditionalOrRelationshipValidation[]
): JsonSchema => {
  const orOptionRequirements: OptionRequirements = filter(
    (optionRequirement: OptionRequirement): boolean => {
      if (typeof optionRequirement === 'string') return false;
      return 'or' in optionRequirement;
    },
    optionRequirements
  );

  const orOptionsSchemas: JsonSchema = flow(
    map((orOptionRequirement: OptionRequirement): JsonSchema => {
      if (
        typeof orOptionRequirement === 'string' ||
        'option' in orOptionRequirement ||
        'if' in orOptionRequirement
      )
        return {};

      const orItemRequirementSchema: JsonSchema = generateOrItemRequirementSchema(
        userOptions,
        orOptionRequirement.or
      );
      const jsonSchemaForThisOption: JsonSchema = {
        keys: getOptionKeysFromOptionRequirement(orOptionRequirement),
        message:
          orOptionRequirement.message ||
          generateMessageForOrOptionRequirements(orItemRequirementSchema),
        anyOf: orItemRequirementSchema
      };

      return jsonSchemaForThisOption;
    })
  )(orOptionRequirements);

  return orOptionsSchemas;
};

const generateOrItemRequirementSchema = (
  userOptions: UserOptions,
  orOptionRequirementItems: PossibleOrItem[]
): JsonSchema[] =>
  map((orItem: PossibleOrItem): JsonSchema => {
    if (typeof orItem === 'string' || 'option' in orItem)
      return {
        properties: generateIndividualOptionsSchema(userOptions, [orItem])
      };

    if ('and' in orItem)
      return {
        allOf: map(
          (andItem: OptionValidation): JsonSchema => ({
            properties: generateIndividualOptionsSchema(userOptions, [andItem])
          }),
          orItem.and
        )
      };
  }, orOptionRequirementItems);

const generateMessageForOrOptionRequirements = (
  orItemRequirementSchema: JsonSchema
): string => {
  //TODO - Account for both individual and `and` option validations
  //TODO - Use manual/automated messages for each item along with Option Names(not keys) to generate message
  return '';
};
export default generateOrOptionsSchemas;
