import { parseErrorToReadableJson } from '../../lib/errors';

class NewError extends Error {
  newProperty: string | undefined
}
describe('parseErrorToReadableJson', () => {
  // Positive Test Cases
  it('should return full JSON representation of Errors including all properties', () => {
    const newError = new NewError('This is the message');
    newError.newProperty = 'This Value';
    const jsonResult = parseErrorToReadableJson(newError);
    expect(jsonResult).toHaveProperty('message', 'This is the message');
    expect(jsonResult).toHaveProperty('newProperty', 'This Value');
    expect(jsonResult).toHaveProperty('stack');

    const loggerParsedError = JSON.parse(JSON.stringify(newError));
    expect(loggerParsedError).not.toHaveProperty('stack');
    expect(loggerParsedError).not.toHaveProperty('message');
  });

  // Negative Test Cases
  it('should not contain all properties when error is not parsed with function', () => {
    const newError = new Error('This is the message');

    const loggerParsedError = JSON.parse(JSON.stringify(newError));
    expect(loggerParsedError).not.toHaveProperty('stack');
    expect(loggerParsedError).not.toHaveProperty('message');
  });
});


