import { getLogger, setLogger } from '../../lib/logging/logger';
import type { Logger } from '@polarityio/integration-types';

const loggingFunctions = {
  child: () => loggingFunctions,
  info: () => 1,
  debug: () => 2,
  trace: () => 3,
  warn: () => 4,
  error: () => 5,
  fatal: () => 6
} as unknown as Logger;

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

describe('default logger child()', () => {
  it('should return the same logger instance from child()', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getLogger } = require('../../lib/logging/logger');
      const logger = getLogger();
      const childLogger = logger.child({ module: 'test' });
      expect(childLogger).toBe(logger);
    });
  });
});

describe('default logger no-args behaviour', () => {
  it('should not throw when log method is called with no arguments', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getLogger } = require('../../lib/logging/logger');
      const logger = getLogger();
      expect(() => logger.info()).not.toThrow();
      expect(() => logger.debug()).not.toThrow();
      expect(() => logger.trace()).not.toThrow();
      expect(() => logger.warn()).not.toThrow();
      expect(() => logger.error()).not.toThrow();
      expect(() => logger.fatal()).not.toThrow();
    });
  });
});

describe('getLogger default behaviour (no setLogger)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should have noop log methods that do not throw', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getLogger } = require('../../lib/logging/logger');
      const logger = getLogger();

      const loggingLevels = ['info', 'debug', 'trace', 'warn', 'error', 'fatal'] as const;
      loggingLevels.forEach((level) => {
        expect(() =>
          (logger as Record<string, (...args: unknown[]) => void>)[level](
            `test message for ${level}`
          )
        ).not.toThrow();
      });
    });
  });
});
