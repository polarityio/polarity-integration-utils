import { Integration } from '../../types';
import { validateIntegration } from '../enhanced-utils/validate-integration';
import * as fs from 'fs';
import * as path from 'path';
import { testDoLookup } from './test-do-lookup';
import { testOnMessage } from './test-on-message';

export const createIntegrationTests = (integration: Integration) => {
  const configPath = path.join(process.cwd(), 'config', 'config.json');
  const config = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    : undefined;

  validateIntegration(integration, config);

  return {
    testDoLookup: testDoLookup.bind(null, integration),
    testOnMessage: testOnMessage.bind(null, integration)
  };
};
