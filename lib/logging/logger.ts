import fs from 'fs';
import { flow, reduce } from 'lodash/fp';

const loggingLevels = ['info', 'debug', 'trace', 'warn', 'error', 'fatal'];

const writeToDevRunnerResults =
  (loggingLevel: string) =>
  (...content: unknown[]) =>
    fs.appendFileSync(
      'devRunnerResults.json',
      '\n' + JSON.stringify({ SOURCE: `Logger.${loggingLevel}`, content }, null, 2)
    );

let _logger: Logger = flow(
  reduce(
    (agg, level: string) => ({ ...agg, [level]: writeToDevRunnerResults(level) }),
    {}
  )
)(loggingLevels);

/**
 * @public
 */
export type Logger = {
  child?(arg: unknown): Logger;
  info(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  trace(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  fatal(...args: unknown[]): void;
};

/**
 * Set the logger object used by the integration.
 * 
 * @example
 * Example of setting the logger within the integration's startup method:
 * ```js
 * const { setLogger } = require('polarity-integration-utils/logger');
 * 
 * function startup(logger){
 *   setLogger(logger);
 * }
 * ```
 * 
 * You can now use {@link getLogger} to get the logger object anywhere within your integration codebase.
 * 
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
 * const { getLogger } = require('polarity-integration-utils/logger');
 * 
 * const logger = getLogger();
 * logger.trace('this is a trace message');
 * ```
 * 
 * @public
 * @returns the integration's logger object
 */
const getLogger = () => _logger;

export { setLogger, getLogger };
