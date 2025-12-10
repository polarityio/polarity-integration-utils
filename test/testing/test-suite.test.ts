import { createIntegrationTests, createEntity } from '../../lib/testing';
import * as mockIntegration from './mock-integration';

const { testDoLookup, testOnMessage } = createIntegrationTests(mockIntegration);

describe('testDoLookup', () => {
  testDoLookup('should return a result for a valid IP', {
    entities: [createEntity('IP', '8.8.8.8')],
    options: {},
    expected: [
      {
        entity: createEntity('IP', '8.8.8.8'),
        data: {
          summary: ['Google DNS'],
          details: {
            isGoogle: true
          }
        }
      }
    ]
  });
});

describe('testOnMessage', () => {
  testOnMessage('should return a pong for a ping', {
    command: 'ping',
    args: [],
    expected: {
      message: 'pong'
    }
  });
});
