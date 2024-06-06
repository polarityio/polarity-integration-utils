import { get } from 'lodash/fp';
import _reduce from 'lodash/fp/reduce';
const reduce = _reduce.convert({ cap: false });

import {
  DoLookupUserOptions,
  ValidateOptionsUserOption,
  ValidateOptionsUserOptions
} from './types';

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
