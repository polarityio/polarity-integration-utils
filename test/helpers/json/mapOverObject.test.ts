import { identity } from 'lodash/fp';
import mapOverObject from '../../../lib/helpers/json/mapOverObject';

const objToMapOver = { a: 1, b: 2, c: 3 };
const testFunctions = {
  concatA: (value, key) => [`${key}A`, `${value}A`]
}

jest.spyOn(testFunctions, 'concatA');

describe('mapOverObject', () => {
  // Positive Test Cases
  it('should run passed in function for each key value pair in object', () => {
    const result = mapOverObject(testFunctions.concatA, objToMapOver);
    
    expect(result).toEqual({ aA: '1A', bA: '2A', cA: '3A' });
    expect(testFunctions.concatA).toHaveBeenCalledTimes(3);
  });

  // Negative Test Cases
  it('should just return non-object inputs', () => {
    expect(mapOverObject(identity, 'not an object')).toEqual('not an object');
    expect(mapOverObject(identity, '')).toEqual('');
    expect(mapOverObject(identity, 123)).toEqual(123);
    expect(mapOverObject(identity, 0)).toEqual(0);
    expect(mapOverObject(identity, [1, 2, 3])).toEqual([1, 2, 3]);
  });
});
