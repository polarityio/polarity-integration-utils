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

const loggingLevels = ['info', 'debug', 'trace', 'warn', 'error', 'fatal'] as const;

describe('getLogger default behaviour (no setLogger)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should write to devRunnerResults.json at the correct level', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      const appendSpy = jest
        .spyOn(fs, 'appendFileSync')
        // Prevent actual file writes during the test run
        .mockImplementation(() => {});

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getLogger } = require('../../lib/logging/logger');

      const logger = getLogger();
      loggingLevels.forEach((level) => {
        (logger as Record<string, (...args: unknown[]) => void>)[level](
          `test message for ${level}`
        );
      });

      expect(appendSpy).toHaveBeenCalledTimes(loggingLevels.length);

      loggingLevels.forEach((level, idx) => {
        expect(appendSpy).toHaveBeenNthCalledWith(
          idx + 1,
          'devRunnerResults.json',
          expect.stringContaining(`"SOURCE": "Logger.${level}"`)
        );
      });

      appendSpy.mockRestore();
    });
  });
});
