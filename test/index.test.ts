import { parseErrorToReadableJson } from '../lib/errors';
import { setLogger, getLogger } from '../lib/logging';

describe('index.js', () => {
  it('should export functions with implementation', () => {
    expect(parseErrorToReadableJson).toBeInstanceOf(Function);
    expect(setLogger).toBeInstanceOf(Function);
    expect(getLogger).toBeInstanceOf(Function);
  });
});
