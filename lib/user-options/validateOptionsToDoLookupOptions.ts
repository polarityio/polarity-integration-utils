import { get } from 'lodash/fp';
import _reduce from 'lodash/fp/reduce';

// @ts-expect-error typescript definitions for lodash/fp do not include convert (known issue: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/27194)
const reduce = _reduce.convert({ cap: false });

import {
  DoLookupUserOptions,
  ValidateOptionsUserOption,
  ValidateOptionsUserOptions
} from './types';

/**
 * @alpha 
 * @param options - options to validate from `doLookup` method
 */
const validateOptionsToDoLookupOptions = (
  options: ValidateOptionsUserOptions
): DoLookupUserOptions =>
  reduce(
    (
      agg: DoLookupUserOptions,
      optionObj: ValidateOptionsUserOption,
      optionKey: string
    ) => ({
      ...agg,
      [optionKey]: get('value', optionObj)
    }),
    {},
    options
  );

export default validateOptionsToDoLookupOptions;
