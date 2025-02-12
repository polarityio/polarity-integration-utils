import { map, shuffle } from 'lodash/fp';
import or from '../../../lib/helpers/json/or';

type NonEmptyArray<T> = [T, ...T[]];
type Predicate<T> = (x: T) => unknown;

const truthyValueFunctions: NonEmptyArray<Predicate<string>> = [
  () => 'contains content',
  (x) => x,
  () => [],
  () => true
];
const falsyValueFunctions: NonEmptyArray<Predicate<string>> = [
  () => false,
  (x) => !x,
  () => [].length,
  () => ''
];
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
    const shuffledFunctions: NonEmptyArray<Predicate<string>> = shuffle(
      truthyAndFalsyValueFunctions
    ) as NonEmptyArray<Predicate<string>>;

    expect(or(...shuffledFunctions)(inputString)).toBe(true);
  });
  
  it('should run next `or` function until a truthy value is returned from one of the functions', () => {
    const functionsResults = [];
    const functionsWithTrackingSideEffects: NonEmptyArray<Predicate<string>> = map(
      trackResults(functionsResults),
      truthyAndFalsyValueFunctions
    ) as NonEmptyArray<Predicate<string>>;

    or(...functionsWithTrackingSideEffects)(inputString);
    expect(functionsResults).toEqual([false, false, 0, '']);
    expect(testFunctions.spyableTrackResults).toHaveBeenCalledTimes(5);
  });
  
  it('should only run first function if it returns a truthy value', () => {
    const functionsResults = [];
    const functionsWithTrackingSideEffects: NonEmptyArray<Predicate<string>> = map(
      trackResults(functionsResults),
      truthyValueFunctions
    ) as NonEmptyArray<Predicate<string>>;

    or(...functionsWithTrackingSideEffects)(inputString);

    expect(functionsResults).toEqual([]);
    expect(testFunctions.spyableTrackResults).toHaveBeenCalledTimes(6);
  });
});
