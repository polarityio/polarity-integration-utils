import fs from 'fs';
import type { Logger } from '@polarityio/integration-types';

const createLogMethod =
  (loggingLevel: string) =>
  (...content: unknown[]) => {
    if (content.length === 0) return true;
    fs.appendFileSync(
      'devRunnerResults.json',
      '\n' + JSON.stringify({ SOURCE: `Logger.${loggingLevel}`, content }, null, 2)
    );
  };

function createDefaultLogger(): Logger {
  const logger = {
    child: () => logger as Logger,
    trace: createLogMethod('trace'),
    debug: createLogMethod('debug'),
    info: createLogMethod('info'),
    warn: createLogMethod('warn'),
    error: createLogMethod('error'),
    fatal: createLogMethod('fatal')
  };
  return logger as Logger;
}

let _logger: Logger = createDefaultLogger();

/**
 * Set the logger object used by the integration.
 * 
 * @example
 * Example of setting the logger within the integration's startup method:
 * ```js
 * const { setLogger } = require('polarity-integration-utils');
 * 
 * function startup(logger){
 *   setLogger(logger);
 * }
 * ```
 * 
 * You can now use {@link getLogger} to get the logger object anywhere within your integration codebase.
 * 
 * @group Logging
 * @public
 * @param logger - the integration logger object passed into the `startup` method
 */
const setLogger = (logger: Logger) => {
  _logger = logger;
};

/**
 * return the logger object set via the {@link setLogger} method.
 * 
 * @example
 * Example of using the integration's logging object:
 * ```js
 * const { getLogger } = require('polarity-integration-utils');
 * 
 * const logger = getLogger();
 * logger.trace('this is a trace message');
 * ```
 * 
 * @group Logging
 * @public
 * @returns the integration's logger object
 */
const getLogger = () => _logger;

export { setLogger, getLogger };
