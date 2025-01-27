import { isEmpty } from 'lodash/fp';
import _reduce from 'lodash/fp/reduce';

// @ts-expect-error typescript definitions for lodash/fp do not include convert (known issue: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/27194)
const reduce = _reduce.convert({ cap: false });

import { ValidationError, ValidateOptionsUserOption } from './types';

/**
 * @alpha 
 * @param stringOptionsErrorMessages - existing errors to extend
 * @param options - list of options to validate
 * @param otherErrors - existing errors to concatenate
 */
const validateStringOptions = (
  stringOptionsErrorMessages: { [key: string]: string },
  options: ValidateOptionsUserOption,
  otherErrors: ValidationError[] = []
) =>
  reduce((agg: ValidationError[], message: string, optionName: string) => {
    const isString = typeof options[optionName].value === 'string';
    const isEmptyString = isString && isEmpty(options[optionName].value);

    return !isString || isEmptyString
      ? agg.concat({
          key: optionName,
          message
        })
      : agg;
  }, otherErrors)(stringOptionsErrorMessages);

export default validateStringOptions;
