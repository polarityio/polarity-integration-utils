import { getLogger, setLogger } from '../../lib/logging/logger';

const loggingFunctions = {
  info: () => 1,
  debug: () => 2,
  trace: () => 3,
  warn: () => 4,
  error: () => 5,
  fatal: () => 6
};

describe('getLogger', () => {
  it('should have default logging functions', () => {
    const logger = getLogger();

    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.trace).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.fatal).toBe('function');
  });
  
  // Positive Test Cases
  it('should run logging functions that are passed in', () => {
    setLogger(loggingFunctions);

    const logger = getLogger();
    expect(logger.info()).toEqual(1);
    expect(logger.debug()).toEqual(2);
    expect(logger.trace()).toEqual(3);
    expect(logger.warn()).toEqual(4);
    expect(logger.error()).toEqual(5);
    expect(logger.fatal()).toEqual(6);
  });  
});
