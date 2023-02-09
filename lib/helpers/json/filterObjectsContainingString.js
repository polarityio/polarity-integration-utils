const { filter, flow, replace, toLower, includes, curry } = require('lodash/fp');

const filterObjectsContainingString = curry((string, objs = []) => {
  const modifiedSearchString = flow(replace(/[^\w]/g, ''), toLower)(string);
  if(!modifiedSearchString) return [];

  return filter(
    flow(
      JSON.stringify,
      replace(/[^\w]/g, ''),
      toLower,
      includes(modifiedSearchString)
    ),
    objs
  )
}
);

module.exports = filterObjectsContainingString;
