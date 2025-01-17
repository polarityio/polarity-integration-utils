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

let logger: LoggingLevels = flow(
  reduce((agg, level) => ({ ...agg, [level]: writeToDevRunnerResults(level) }), {})
)(loggingLevels);

type LoggingLevels = {
  info(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  trace(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  fatal(...args: unknown[]): void;
};

const setLogger = (_logger: LoggingLevels) => {
  logger = _logger;
};

const getLogger = () => logger;

export { setLogger, getLogger };
