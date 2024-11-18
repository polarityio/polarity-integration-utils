import { get, curry, flow, split, map, trim, uniq, compact } from 'lodash/fp';
import { DoLookupUserOptions } from './types';

const splitCommaSeparatedUserOption = curry((key: string, options: DoLookupUserOptions): string[] =>
  flow(get(key), split(','), map(trim), compact, uniq)(options)
);

export default splitCommaSeparatedUserOption;
