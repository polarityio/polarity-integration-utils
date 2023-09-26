import { map, shuffle } from 'lodash/fp';
import and from '../../../lib/helpers/json/and';

const truthyValueFunctions = [(x?: any) => true, (x?: any) => x, (x?: any) => [], (x?: any) => 'contains content'];
const falsyValueFunctions = [(x?: any) => false, (x?: any) => !x, (x?: any) => [].length, (x?: any) => ''];
const truthyAndFalsyValueFunctions = truthyValueFunctions.concat(falsyValueFunctions);
const inputString =
  'This string is passed into each function passed into the `and` function';

const testFunctions = {
  spyableTrackResults: (functionsResults, func?: any, x?: any) => {
    const result = func(x);
    if (result) functionsResults.push(result);
    return result;
  }
};

const trackResults = (functionsResults) => (func?: any) => (x?: any) =>
  testFunctions.spyableTrackResults(functionsResults, func, x);

jest.spyOn(testFunctions, 'spyableTrackResults');

describe('and', () => {
  it('should return true if all function return a truthy value', () => {
    expect(and.apply(null, truthyValueFunctions)(inputString)).toBe(true);
  });
  it('should return false if all function return a falsy value', () => {
    expect(and.apply(null, falsyValueFunctions)(inputString)).toBe(false);
  });
  it('should return false if any function return a falsy value', () => {
    const shuffledFunctions = shuffle(truthyAndFalsyValueFunctions);

    expect(and.apply(null, shuffledFunctions)(inputString)).toBe(false);
  });
  it('should run each function that returns a truthy value', () => {
    const functionsResults = [];
    const truthyFunctionsWithTrackingSideEffects = map(
      trackResults(functionsResults),
      truthyValueFunctions
    );

    const result = and.apply(null, truthyFunctionsWithTrackingSideEffects)(inputString);

    expect(result).toEqual(true);
    expect(functionsResults).toEqual([true, inputString, [], 'contains content']);
    expect(testFunctions.spyableTrackResults).toHaveBeenCalledTimes(4);
  });
  it('should stop running functions once a falsy value is returned by one of the functions', () => {
    const functionsResults = [];
    const functionsWithTrackingSideEffects = map(
      trackResults(functionsResults),
      truthyAndFalsyValueFunctions
    );

    const result = and.apply(null, functionsWithTrackingSideEffects)(inputString);

    expect(result).toEqual(false);
    expect(functionsResults).toEqual([true, inputString, [], 'contains content']);
    expect(testFunctions.spyableTrackResults).toHaveBeenCalledTimes(9);
  });
});
