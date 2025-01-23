import { errors, helpers, userOptions, logging } from '../lib/index';

const { parseErrorToReadableJson } = errors;
const {
  decodeBase64,
  encodeBase64,
  filterObjectsContainingString,
  mapOverObject,
  transpose2dArray,
  and,
  or,
  millisecondsToHoursMinutesAndSeconds,
  sleep,
  parallelLimit
} = helpers;

const { validateUrlOption } = userOptions;
const { setLogger, getLogger } = logging;

describe('index.js', () => {
  it('should export functions with implementation', () => {
    expect(parseErrorToReadableJson).toBeInstanceOf(Function);
    expect(decodeBase64).toBeInstanceOf(Function);
    expect(encodeBase64).toBeInstanceOf(Function);
    expect(filterObjectsContainingString).toBeInstanceOf(Function);
    expect(mapOverObject).toBeInstanceOf(Function);
    expect(transpose2dArray).toBeInstanceOf(Function);
    expect(and).toBeInstanceOf(Function);
    expect(or).toBeInstanceOf(Function);
    expect(millisecondsToHoursMinutesAndSeconds).toBeInstanceOf(Function);
    expect(sleep).toBeInstanceOf(Function);
    expect(parallelLimit).toBeInstanceOf(Function);
    expect(validateUrlOption).toBeInstanceOf(Function);
    expect(setLogger).toBeInstanceOf(Function);
    expect(getLogger).toBeInstanceOf(Function);
  });
});
