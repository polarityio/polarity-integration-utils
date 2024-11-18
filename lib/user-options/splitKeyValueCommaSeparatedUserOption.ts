import { get, curry, flow, split, map, trim, uniq, compact, fromPairs } from 'lodash/fp';
import { DoLookupUserOptions } from './types';

const splitKeyValueCommaSeparatedUserOption = curry(
  (key: string, options: DoLookupUserOptions): { [key: string]: string } =>
    flow(
      get(key),
      split(','),
      map(trim),
      compact,
      uniq,
      map(flow(split(':'), map(trim))),
      fromPairs
    )(options)
);


export default splitKeyValueCommaSeparatedUserOption;
