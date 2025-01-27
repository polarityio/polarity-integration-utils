import fs from 'fs';
import { flow, reduce } from 'lodash/fp';

const loggingLevels = ['info', 'debug', 'trace', 'warn', 'error', 'fatal'];

const writeToDevRunnerResults =
  (loggingLevel) =>
  (...content) =>
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
  child?(arg: unknown): void;
  info(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  trace(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  fatal(...args: unknown[]): void;
};

/**
 * @public
 * @param logger - the integration logger object passed into the `startup` method
 */
const setLogger = (logger: Logger) => {
  _logger = logger;
};

/**
 * @public
 * @returns the integration's logger object
 */
const getLogger = () => _logger;

export { setLogger, getLogger };
