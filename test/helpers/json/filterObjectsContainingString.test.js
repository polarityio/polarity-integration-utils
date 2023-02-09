const filterObjectsContainingString = require('../../../lib/helpers/json/filterObjectsContainingString');

const objects = [
  { a: 'foo', b: 'b', baz: 'c' },
  { a: 'baz', b: 'bArZ', c: 'la' },
  { a: 'as!&*@#()df', b: 'Bar', c: 'c' }
];

describe('filterObjectsContainingString', () => {
  it('should return an empty array if an empty array passed in', () => {
    expect(filterObjectsContainingString('string in object', [])).toEqual([]);
  });
  it('should return an empty array if the string passed in is not in any of the objects passed in', () => {
    expect(filterObjectsContainingString('not in any objects', objects)).toEqual([]);
  });
  it('should return only objects that contain string characters in key or value', () => {
    expect(filterObjectsContainingString('baz', objects)).toEqual([
      { a: 'foo', b: 'b', baz: 'c' },
      { a: 'baz', b: 'bArZ', c: 'la' },
    ]);
  });
  it('should return objects that contain string characters in key or value regardless of casing', () => {
    expect(filterObjectsContainingString('bar', objects)).toEqual([
      { a: 'baz', b: 'bArZ', c: 'la' },
      { a: 'as!&*@#()df', b: 'Bar', c: 'c' }
    ]);
  });
  it('should remove special characters from search return only objects that contain string ', () => {
    expect(filterObjectsContainingString('asdf', objects)).toEqual([{ a: 'as!&*@#()df', b: 'Bar', c: 'c' }]);
    expect(filterObjectsContainingString('as&*@df', objects)).toEqual([{ a: 'as!&*@#()df', b: 'Bar', c: 'c' }]);
    expect(filterObjectsContainingString('!&*@#()', objects)).toEqual([]);
  });
});
