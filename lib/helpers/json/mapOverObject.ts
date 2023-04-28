const {
  flow,
  map,
  size,
  negate,
  curry,
  filter,
  eq,
  isEmpty,
  isPlainObject
} = require('lodash/fp');
const { and } = require('../process-management');

/**
 * Function to map over properties in an object.
 * This allows for transformations on both the keys and values of each properties.
 * This function also supports currying
 *
 * @param func - function that takes in `value` & `key' from each object property and
 *   returns a new key and new value in an array of length 2
 *   e.g. (value, key) => [newKey, newValue]
 * @param obj - JSON object which we wish to map over the properties of
 *   e.g. { key1: value1, key2: value2 }
 * @returns - JSON object with the transformed keys and values for each property
 *   e.g. { newKey1: newValue1, newKey2: newValue2 }
 */
const mapOverObject = curry((func, obj) =>
  obj && isPlainObject(obj) 
    ? flow(
        Object.entries,
        map(([key, value]) => func(value, key)),
        filter(and(negate(isEmpty), flow(size, eq(2)))),
        Object.fromEntries
      )(obj)
    : obj
);

module.exports = mapOverObject;
