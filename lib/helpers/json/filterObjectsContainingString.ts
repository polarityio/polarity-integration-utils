import { filter, flow, replace, toLower, includes, curry } from 'lodash/fp';

type FilterObjectsFn = {
  <T>(searchString: string): (objs: T[]) => T[];
  <T>(searchString: string, objs: T[]): T[];
};

function filterObjectsContainingStringImpl<T>(searchString: string, objs: T[]): T[] {
  const modifiedSearchString = flow(replace(/\W/g, ''), toLower)(searchString);
  if (!modifiedSearchString) return [];

  return filter(
    flow(JSON.stringify, replace(/\W/g, ''), toLower, includes(modifiedSearchString)),
    objs
  );
}

const filterObjectsContainingString = curry(
  filterObjectsContainingStringImpl
) as FilterObjectsFn;

export default filterObjectsContainingString;
