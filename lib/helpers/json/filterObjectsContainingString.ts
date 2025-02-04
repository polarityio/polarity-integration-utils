import { filter, flow, replace, toLower, includes, curry } from 'lodash/fp';

/**
 * @public
 */
type FilterObjectsFn = {
  <T>(searchString: string): (objs: T[]) => T[];
  <T>(searchString: string, objs: T[]): T[];
};

/**
 * Filters an array of objects, returning only those that contain the specified string.
 * The search string is modified to remove non-word characters and converted to lowercase.
 *
 * @internal
 * @param searchString - The string to search for within the objects.
 * @param objs - The array of objects to filter.
 * @returns The filtered array of objects.
 */
function filterObjectsContainingStringImpl<T>(searchString: string, objs: T[]): T[] {
  const modifiedSearchString = flow(replace(/\W/g, ''), toLower)(searchString);
  if (!modifiedSearchString) return [];

  return filter(
    flow(JSON.stringify, replace(/\W/g, ''), toLower, includes(modifiedSearchString)),
    objs
  );
}

/**
 * Curried function to filter objects containing a specified string.
 *
 * @public
 * @param searchString - The string to search for within the objects.
 * @param objs - The array of objects to filter.
 * @returns A function that takes an array of objects and returns the filtered array, or the filtered array if both parameters are provided.
 */
const filterObjectsContainingString = curry(
  filterObjectsContainingStringImpl
) as FilterObjectsFn;

export default filterObjectsContainingString;
