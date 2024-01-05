import { JsonSchema } from 'json-schema-library';
import {
  flow,
  toPairs,
  fromPairs,
  map,
  filter,
  size,
  first,
  negate,
  isEmpty
} from 'lodash/fp';

import {
  ConditionalOptionValidation,
  OptionRequirement,
  OptionRequirements,
  PossibleOptionType,
  UserOption,
  UserOptions
} from '../types';
import getOptionKeysFromOptionRequirement from './getOptionKeysFromOptionRequirement';

const generateIndividualOptionsSchema = (
  userOptions: UserOptions,
  optionRequirements: OptionRequirements | ConditionalOptionValidation[]
): JsonSchema => {
  const individualOptionRequirements: OptionRequirements = filter(
    (optionRequirement: OptionRequirement): boolean =>
      typeof optionRequirement === 'string' || 'option' in optionRequirement,
    optionRequirements
  );

  const propertySchemaRequirements: JsonSchema = flow(
    toPairs,
    map(generateSchemaForUserOption(individualOptionRequirements)),
    filter(([optionKey, optionSchema]: [string, JsonSchema]): boolean =>
      negate(isEmpty)(optionSchema)
    ),
    fromPairs
  )(userOptions);

  return propertySchemaRequirements;
};

const generateSchemaForUserOption =
  (individualOptionRequirements: OptionRequirements) =>
  ([optionKey, userOption]: [string, UserOption]): [string, JsonSchema] => {
    const optionRequirementsForThisOption: OptionRequirements =
      getRequirementsForThisOption(userOption, individualOptionRequirements);

    if (!size(optionRequirementsForThisOption)) return [optionKey, {}];

    const valueSchema: JsonSchema = generateJsonSchemaForUserOptionByOptionType[
      userOption.type
    ](userOption, optionRequirementsForThisOption);

    const jsonSchemaForThisOption: JsonSchema = {
      type: 'object',
      required: ['value'],
      properties: {
        value:
          size(optionRequirementsForThisOption) === 1
            ? first(valueSchema)
            : { allOf: valueSchema }
      }
    };

    return [optionKey, jsonSchemaForThisOption];
  };

const getRequirementsForThisOption = (
  userOption: UserOption,
  optionRequirements: OptionRequirements
): OptionRequirements =>
  filter(
    (optionRequirement: OptionRequirement): boolean =>
      getOptionKeysFromOptionRequirement(optionRequirement).includes(userOption.key),
    optionRequirements
  );

const generateTextOptionJsonSchema = (
  userOption: UserOption,
  optionRequirementsForThisOption: OptionRequirements
): JsonSchema[] =>
  map((optionRequirement: OptionRequirement): JsonSchema => {
    const errorMessageDetails = getErrorMessageDetails(userOption, optionRequirement);

    if (typeof optionRequirement === 'string')
      return {
        type: 'string',
        minLength: 1,
        ...errorMessageDetails
      };

    if ('option' in optionRequirement) {
      return {
        type: 'string',
        minLength: 1,
        ...errorMessageDetails,
        ...((optionRequirement.gt || optionRequirement.gt === 0) && {
          minLength: optionRequirement.gt + 1
        }),
        ...(optionRequirement.gte && {
          minLength: optionRequirement.gte
        }),
        ...(optionRequirement.lt && {
          maxLength: optionRequirement.lt - 1
        }),
        ...(optionRequirement.lte && {
          maxLength: optionRequirement.lte
        }),
        ...(optionRequirement.pattern && {
          pattern: optionRequirement.pattern
        }),
        ...(optionRequirement.format && {
          format: optionRequirement.format
        })
      };
    }
  }, optionRequirementsForThisOption);

const generateNumberOptionJsonSchema = (
  userOption: UserOption,
  optionRequirementsForThisOption: OptionRequirements
): JsonSchema[] =>
  map((optionRequirement: OptionRequirement): JsonSchema => {
    const errorMessageDetails = getErrorMessageDetails(userOption, optionRequirement);

    if (typeof optionRequirement === 'string')
      return {
        type: 'number',
        ...errorMessageDetails
      };

    if ('option' in optionRequirement) {
      return {
        type: 'number',
        ...errorMessageDetails,
        ...((optionRequirement.gt || optionRequirement.gt === 0) && {
          exclusiveMinimum: optionRequirement.gt
        }),
        ...(optionRequirement.gte && {
          minimum: optionRequirement.gte
        }),
        ...(optionRequirement.lt && {
          exclusiveMaximum: optionRequirement.lt
        }),
        ...(optionRequirement.lte && {
          maximum: optionRequirement.lte
        })
      };
    }
  }, optionRequirementsForThisOption);

const generateBooleanOptionJsonSchema = (
  userOption: UserOption,
  optionRequirementsForThisOption: OptionRequirements
): JsonSchema[] =>
  map(
    (optionRequirement: OptionRequirement): JsonSchema => ({
      type: 'boolean',
      const: true
    }),
    optionRequirementsForThisOption
  );

const generateSelectOptionJsonSchema = (
  userOption: UserOption,
  optionRequirementsForThisOption: OptionRequirements
): JsonSchema[] =>
  map((optionRequirement: OptionRequirement): JsonSchema => {
    const errorMessageDetails = getErrorMessageDetails(userOption, optionRequirement);

    if (typeof optionRequirement === 'string') {
      if (!userOption.multiple) return { type: 'object', ...errorMessageDetails };
      else {
        return {
          type: 'array',
          minItems: 1,
          ...errorMessageDetails
        };
      }
    }

    if ('option' in optionRequirement) {
      const selectOptionPatternFormatSchema: JsonSchema = !(
        optionRequirement.pattern || optionRequirement.format
      )
        ? { type: 'object', ...errorMessageDetails }
        : generateSelectOptionPatternFormatSchema(errorMessageDetails, optionRequirement);

      if (!userOption.multiple) {
        return selectOptionPatternFormatSchema;
      } else {
        return {
          type: 'array',
          minItems: 1,
          ...errorMessageDetails,

          contains: selectOptionPatternFormatSchema,

          ...((optionRequirement.gt || optionRequirement.gt === 0) && {
            minItems: optionRequirement.gt + 1
          }),
          ...(optionRequirement.gte && {
            minItems: optionRequirement.gte
          }),
          ...(optionRequirement.lt && {
            maxLength: optionRequirement.lt - 1
          }),
          ...(optionRequirement.lte && {
            maxLength: optionRequirement.lte
          })
        };
      }
    }
  }, optionRequirementsForThisOption);

const generateSelectOptionPatternFormatSchema = (
  errorMessageDetails: ErrorMessageDetails,
  optionRequirement: { pattern?: string; format?: string }
) => ({
  type: 'object',
  properties: {
    value: {
      type: 'string',
      ...errorMessageDetails,
      ...(optionRequirement.pattern && { pattern: optionRequirement.pattern }),
      ...(optionRequirement.format && { format: optionRequirement.format })
    }
  }
});

const generateJsonSchemaForUserOptionByOptionType: OptionSchemaGeneratorsByOptionType = {
  text: generateTextOptionJsonSchema,
  password: generateTextOptionJsonSchema,
  number: generateNumberOptionJsonSchema,
  boolean: generateBooleanOptionJsonSchema,
  select: generateSelectOptionJsonSchema
};

type OptionSchemaGeneratorsByOptionType = {
  [key in PossibleOptionType]: OptionSchemaGenerator;
};
type OptionSchemaGenerator = (
  userOption: UserOption,
  optionRequirements: OptionRequirements
) => JsonSchema[];

type ErrorMessageDetails = { key: string; optionName: string; message: string } | {};

const getErrorMessageDetails = (
  userOption: UserOption,
  optionRequirement: OptionRequirement
): ErrorMessageDetails => {
  if (typeof optionRequirement === 'string')
    return {
      key: userOption.key,
      optionName: userOption.name,
      message: '* Required'
    };

  if ('if' in optionRequirement) return {};

  return {
    key: userOption.key,
    optionName: userOption.name,
    message:
      optionRequirement.message ||
      generateMessageForOptionRequirementsByOptionType[userOption.type](
        userOption,
        optionRequirement
      )
  };
};

const generateTextOptionMessage = (
  userOption: UserOption,
  optionRequirement: OptionRequirement
): string => {
  return 'TODO';
};
const generateNumberOptionMessage = (
  userOption: UserOption,
  optionRequirement: OptionRequirement
): string => {
  return 'TODO';
};
const generateBooleanOptionMessage = (
  userOption: UserOption,
  optionRequirement: OptionRequirement
): string => {
  return 'TODO';
};
const generateSelectOptionMessage = (
  userOption: UserOption,
  optionRequirement: OptionRequirement
): string => {
  return 'TODO';
};

const generateMessageForOptionRequirementsByOptionType: MessageGeneratorByOptionType = {
  text: generateTextOptionMessage,
  password: generateTextOptionMessage,
  number: generateNumberOptionMessage,
  boolean: generateBooleanOptionMessage,
  select: generateSelectOptionMessage
};

type MessageGeneratorByOptionType = {
  [key in PossibleOptionType]: MessageGenerator;
};
type MessageGenerator = (
  userOption: UserOption,
  optionRequirement: OptionRequirement
) => string;

export default generateIndividualOptionsSchema;
