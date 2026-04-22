import type {
  DoLookupUserOptions,
  Entity,
  DoLookupResult,
  Logger,
  IntegrationContext,
  ValidateOptionsUserOptions,
  ValidationError
} from '../../lib/types';

export const startup = async (logger: Logger) => {
  logger.info('starting up');
};

export const doLookup = async (
  entities: Entity[],
  _options: DoLookupUserOptions,
  _context: IntegrationContext
): Promise<DoLookupResult> => {
  const results = entities.map((entity) => ({
    entity,
    data: {
      summary: ['Google DNS'],
      details: {
        isGoogle: true
      }
    }
  }));

  return results;
};

export const onMessage = async (
  payload: { command: string },
  _options: DoLookupUserOptions,
  _context: IntegrationContext
) => {
  if (payload.command === 'ping') {
    return {
      message: 'pong'
    };
  }
};

export const validateOptions = (
  _options: ValidateOptionsUserOptions,
  _context: IntegrationContext
): ValidationError[] => {
  return [];
};
