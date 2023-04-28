const NotImplementedError = require('../../lib/errors/NotImplementedError');

const functionThrowingNotImplementedError = (message) => {
  throw new NotImplementedError(message);
}

describe('NotImplementedError', () => {
  // Positive Test Cases
  it('should contain the name of the function throwing the error in the message', () => {
    expect(functionThrowingNotImplementedError).toThrow(NotImplementedError);
    try {
      functionThrowingNotImplementedError()
    } catch (error) {
      expect(error.message).toContain('functionThrowingNotImplementedError')
    }
  });
  it('should contain the passed-in message if it exists in the error message when throwing', () => {
    const customMessage = "To Implement at a Later Point"
    expect(() => functionThrowingNotImplementedError(customMessage)).toThrow(NotImplementedError);
    try {
      functionThrowingNotImplementedError(customMessage)
    } catch (error) {
      expect(error.message).toContain(customMessage)
    }
  });
});
