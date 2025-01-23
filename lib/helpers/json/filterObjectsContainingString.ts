import { filter, flow, replace, toLower, includes, curry } from 'lodash/fp';

/**
 * Filters an array of objects, returning only those that contain the specified string.
 *
 * @param {string} string - The string to search for within the objects.
 * @param {Array} [objs=[]] - The array of objects to filter.  Objects are stringified prior to searching.
 * @returns {Array} The filtered array of objects containing the specified string.
 */
const filterObjectsContainingString = curry((string: string, objs = []) => {
  const modifiedSearchString = flow(replace(/\W/g, ''), toLower)(string);
  if (!modifiedSearchString) return [];

  return filter(
    flow(JSON.stringify, replace(/\W/g, ''), toLower, includes(modifiedSearchString)),
    objs
  );
});

export default filterObjectsContainingString;
