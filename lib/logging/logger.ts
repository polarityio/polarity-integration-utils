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
  info(...args: any[]): void;
  debug(...args: any[]): void;
  trace(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  fatal(...args: any[]): void;
};

const setLogger = (_logger: LoggingLevels) => {
  logger = _logger;
};

const getLogger = () => logger;

export { setLogger, getLogger };
