import { helpers, userOptions } from '../lib/index';

import { parseErrorToReadableJson } from '../lib/errors';

const {
  filterObjectsContainingString,
  mapOverObject,
  transpose2dArray,
  and,
  or
} = helpers;

const { validateUrlOption } = userOptions;
import { setLogger, getLogger } from '../lib/logging';

describe('index.js', () => {
  it('should export functions with implementation', () => {
    expect(parseErrorToReadableJson).toBeInstanceOf(Function);
    expect(filterObjectsContainingString).toBeInstanceOf(Function);
    expect(mapOverObject).toBeInstanceOf(Function);
    expect(transpose2dArray).toBeInstanceOf(Function);
    expect(and).toBeInstanceOf(Function);
    expect(or).toBeInstanceOf(Function);
    expect(validateUrlOption).toBeInstanceOf(Function);
    expect(setLogger).toBeInstanceOf(Function);
    expect(getLogger).toBeInstanceOf(Function);
  });
});
