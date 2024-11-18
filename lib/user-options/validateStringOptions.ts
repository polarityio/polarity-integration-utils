import { isEmpty } from 'lodash/fp';
import _reduce from 'lodash/fp/reduce';
const reduce = _reduce.convert({ cap: false });

import { ValidationError, ValidateOptionsUserOption } from './types';

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
