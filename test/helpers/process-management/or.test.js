const { map, shuffle } = require('lodash/fp');
const or = require('../../../lib/helpers/process-management/or');

const truthyValueFunctions = [() => 'contains content', (x) => x, () => [], () => true];
const falsyValueFunctions = [() => false, (x) => !x, () => [].length, () => ''];
const truthyAndFalsyValueFunctions = falsyValueFunctions.concat(truthyValueFunctions);
const inputString =
  'This string is passed into each function passed into the `or` function';

const testFunctions = {
  spyableTrackResults: (functionsResults, func, x) => {
    const result = func(x);
    if (!result) functionsResults.push(result);
    return result;
  }
};

const trackResults = (functionsResults) => (func) => (x) =>
  testFunctions.spyableTrackResults(functionsResults, func, x);

jest.spyOn(testFunctions, 'spyableTrackResults');

describe('or', () => {
  it('should return true if all function return a truthy value', () => {
    expect(or(...truthyValueFunctions)(inputString)).toBe(true);
  });
  it('should return false if all function return a falsy value', () => {
    expect(or(...falsyValueFunctions)(inputString)).toBe(false);
  });
  it('should return true if any function return a true value', () => {
    const shuffledFunctions = shuffle(truthyAndFalsyValueFunctions);

    expect(or(...shuffledFunctions)(inputString)).toBe(true);
  });
  it('should run next `or` function until a truthy value is returned from one of the functions', () => {
    const functionsResults = [];
    const functionsWithTrackingSideEffects = map(
      trackResults(functionsResults),
      truthyAndFalsyValueFunctions
    );

    or(...functionsWithTrackingSideEffects)(inputString);
    expect(functionsResults).toEqual([false, false, 0, '']);
    expect(testFunctions.spyableTrackResults).toHaveBeenCalledTimes(5);
  });
  it('should only run first function if it returns a truthy value', () => {
    const functionsResults = [];
    const functionsWithTrackingSideEffects = map(
      trackResults(functionsResults),
      truthyValueFunctions
    );

    or(...functionsWithTrackingSideEffects)(inputString);

    expect(functionsResults).toEqual([]);
    expect(testFunctions.spyableTrackResults).toHaveBeenCalledTimes(1);

  });
});
