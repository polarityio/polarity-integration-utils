import {
  AndRelationshipValidation,
  ConditionalOptionRequirement,
  OptionRequirement
} from '../types';
import { flow, map, flattenDeep } from 'lodash/fp';

const getOptionKeysFromOptionRequirement = (
  optionRequirement:
    | OptionRequirement
    | AndRelationshipValidation
    | ConditionalOptionRequirement
): string[] => {
  if (typeof optionRequirement === 'string') return [optionRequirement];

  if ('option' in optionRequirement) return [optionRequirement.option];

  if ('and' in optionRequirement)
    return flow(
      map(flow(getOptionKeysFromOptionRequirement, flattenDeep)),
      flattenDeep
    )(optionRequirement.and);

  if ('or' in optionRequirement)
    return flow(
      map(flow(getOptionKeysFromOptionRequirement, flattenDeep)),
      flattenDeep
    )(optionRequirement.or);

  if ('if' in optionRequirement) {
    const ifRequirementOptionKeys = getOptionKeysFromOptionRequirement(
      optionRequirement.if
    );
    let thenRequirementOptionKeys: undefined | string[];
    let elseRequirementOptionKeys: undefined | string[];
    if ('then' in optionRequirement) {
      thenRequirementOptionKeys = getOptionKeysFromOptionRequirement(
        optionRequirement.then
      );
    }
    if ('else' in optionRequirement) {
      elseRequirementOptionKeys = getOptionKeysFromOptionRequirement(
        optionRequirement.else
      );
    }

    return ifRequirementOptionKeys
      .concat(thenRequirementOptionKeys)
      .concat(elseRequirementOptionKeys);
  }
};

export default getOptionKeysFromOptionRequirement;
