const { map, shuffle, forEach } = require('lodash/fp');
const and = require('../../../lib/helpers/process-management/and');

const truthyValueFunctions = [() => true, (x) => x, () => [], () => 'contains content'];
const falsyValueFunctions = [() => false, (x) => !x, () => [].length, () => ''];
const truthyAndFalsyValueFunctions = truthyValueFunctions.concat(falsyValueFunctions);
const inputString =
  'This string is passed into each function passed into the `and` function';

const testFunctions = {
  spyableTrackResults: (functionsResults, func, x) => {
    const result = func(x);
    if (result) functionsResults.push(result);
    return result;
  }
};

const trackResults = (functionsResults) => (func) => (x) =>
  testFunctions.spyableTrackResults(functionsResults, func, x);

jest.spyOn(testFunctions, 'spyableTrackResults');
truthyValueFunctions.forEach((_, i) => jest.spyOn(truthyValueFunctions, i));

describe('and', () => {
  it('should return true if all function return a truthy value', () => {
    expect(and(...truthyValueFunctions)(inputString)).toBe(true);
  });
  it('should return false if all function return a falsy value', () => {
    expect(and(...falsyValueFunctions)(inputString)).toBe(false);
  });
  it('should return false if any function return a falsy value', () => {
    const shuffledFunctions = shuffle(truthyAndFalsyValueFunctions);

    expect(and(...shuffledFunctions)(inputString)).toBe(false);
  });
  it('should run each function that returns a truthy value', () => {
    const functionsResults = [];
    const truthyFunctionsWithTrackingSideEffects = map(
      trackResults(functionsResults),
      truthyValueFunctions
    );

    const result = and(...truthyFunctionsWithTrackingSideEffects)(inputString);

    expect(result).toEqual(true);
    expect(functionsResults).toEqual([true, inputString, [], 'contains content']);
    forEach((func) => expect(func).toHaveBeenCalledTimes(1), truthyValueFunctions);
    expect(testFunctions.spyableTrackResults).toHaveBeenCalledTimes(4);
  });
  it('should stop running functions once a falsy value is returned by one of the functions', () => {
    const functionsResults = [];
    const functionsWithTrackingSideEffects = map(
      trackResults(functionsResults),
      truthyAndFalsyValueFunctions
    );

    const result = and(...functionsWithTrackingSideEffects)(inputString);

    expect(result).toEqual(false);
    expect(functionsResults).toEqual([true, inputString, [], 'contains content']);
    expect(testFunctions.spyableTrackResults).toHaveBeenCalledTimes(5);
  });
});
