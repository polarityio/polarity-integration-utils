import filterObjectsContainingString from '../../../lib/helpers/json/filterObjectsContainingString';

const objects = [
  { a: 'foo', b: 'b', baz: 'c' },
  { a: 'baz', b: 'bArZ', c: 'la' },
  { a: 'as!&*@#()df', b: 'Bar', c: 'c' }
];

describe('filterObjectsContainingString', () => {
  it('should return an empty array if an empty array passed in', () => {
    expect.assertions(2);
    expect(filterObjectsContainingString('string in object', [])).toEqual([]);
    const myFilter = filterObjectsContainingString('string in object');
    expect(myFilter([])).toEqual([]);
  });

  it('should return an empty array if the string passed in is not in any of the objects passed in', () => {
    expect.assertions(1);
    expect(filterObjectsContainingString('not in any objects', objects)).toEqual([]);
  });

  it('should return only objects that contain string characters in key or value', () => {
    expect.assertions(1);
    expect(filterObjectsContainingString('baz', objects)).toEqual([
      { a: 'foo', b: 'b', baz: 'c' },
      { a: 'baz', b: 'bArZ', c: 'la' }
    ]);
  });

  it('should return objects that contain string characters in key or value regardless of casing', () => {
    expect.assertions(1);
    expect(filterObjectsContainingString('bar', objects)).toEqual([
      { a: 'baz', b: 'bArZ', c: 'la' },
      { a: 'as!&*@#()df', b: 'Bar', c: 'c' }
    ]);
  });

  it('should remove special characters from search return only objects that contain string ', () => {
    expect.assertions(3);
    expect(filterObjectsContainingString('asdf', objects)).toEqual([
      { a: 'as!&*@#()df', b: 'Bar', c: 'c' }
    ]);
    expect(filterObjectsContainingString('as&*@df', objects)).toEqual([
      { a: 'as!&*@#()df', b: 'Bar', c: 'c' }
    ]);
    expect(filterObjectsContainingString('!&*@#()', objects)).toEqual([]);
  });
});
