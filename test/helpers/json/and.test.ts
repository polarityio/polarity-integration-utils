import { map, shuffle } from 'lodash/fp';
import and from '../../../lib/helpers/json/and';

type NonEmptyArray<T> = [T, ...T[]];
type Predicate<T> = (x: T) => unknown;

const truthyValueFunctions: NonEmptyArray<Predicate<string>> = [
  () => true,
  (x?: unknown) => x,
  () => [],
  () => 'contains content'
];
const falsyValueFunctions: NonEmptyArray<Predicate<string>> = [() => false, (x?: unknown) => !x, () => [].length, () => ''];
const truthyAndFalsyValueFunctions = truthyValueFunctions.concat(falsyValueFunctions);
const inputString =
  'This string is passed into each function passed into the `and` function';

const testFunctions = {
  spyableTrackResults: (
    functionsResults,
    func?: (x?: unknown) => unknown,
    x?: unknown
  ) => {
    const result = func(x);
    if (result) functionsResults.push(result);
    return result;
  }
};

const trackResults =
  (functionsResults) => (func?: (x?: unknown) => unknown) => (x?: unknown) =>
    testFunctions.spyableTrackResults(functionsResults, func, x);

jest.spyOn(testFunctions, 'spyableTrackResults');

describe('and', () => {
  it('should return true if all function return a truthy value', () => {
    //expect(and.apply(null, truthyValueFunctions)(inputString)).toBe(true);
    expect(and(...truthyValueFunctions)(inputString)).toBe(true);
  });
  it('should return false if all function return a falsy value', () => {
    expect(and(...falsyValueFunctions)(inputString)).toBe(false);
  });
  it('should return false if any function return a falsy value', () => {
    const shuffledFunctions: NonEmptyArray<Predicate<string>> = shuffle(truthyAndFalsyValueFunctions);

    expect(and(...shuffledFunctions)(inputString)).toBe(false);
  });
  it('should run each function that returns a truthy value', () => {
    const functionsResults = [];
    const truthyFunctionsWithTrackingSideEffects: NonEmptyArray<Predicate<string>> = map(
      trackResults(functionsResults),
      truthyValueFunctions
    );

    const result = and(...truthyFunctionsWithTrackingSideEffects)(inputString);

    expect(result).toEqual(true);
    expect(functionsResults).toEqual([true, inputString, [], 'contains content']);
    expect(testFunctions.spyableTrackResults).toHaveBeenCalledTimes(4);
  });
  it('should stop running functions once a falsy value is returned by one of the functions', () => {
    const functionsResults = [];
    const functionsWithTrackingSideEffects: NonEmptyArray<Predicate<string>> = map(
      trackResults(functionsResults),
      truthyAndFalsyValueFunctions
    );

    const result = and(...functionsWithTrackingSideEffects)(inputString);

    expect(result).toEqual(false);
    expect(functionsResults).toEqual([true, inputString, [], 'contains content']);
    expect(testFunctions.spyableTrackResults).toHaveBeenCalledTimes(9);
  });
});
