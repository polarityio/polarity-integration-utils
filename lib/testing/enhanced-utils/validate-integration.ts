import type { Integration, IntegrationContext } from '@polarityio/integration-types';
import { createMockIntegrationContext } from './create-mock-integration-context';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateIntegration = (
  integration: Integration
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check required functions
  checkStartupFunction(integration, result);
  checkDoLookupFunction(integration, result);
  checkOnMessageFunction(integration, result);

  // Check function signatures
  validateFunctionSignatures(integration, result);

  // Check exported integration object structure (e.g. if it's wrapped in an 'integration' property)
  checkIntegrationObject(integration, result);

  result.isValid = result.errors.length === 0;

  if (!result.isValid) {
    throw new Error(
      `Integration validation failed:\n${result.errors.map((e) => `• ${e}`).join('\n')}`
    );
  }

  return result;
};

function checkStartupFunction(integration: Integration, result: ValidationResult) {
  if (typeof integration.startup !== 'function') {
    result.errors.push('Missing required startup function');
  } else {
    if (integration.startup.length !== 1) {
      result.warnings.push(
        `startup function should accept exactly 1 parameter (logger), found ${integration.startup.length}`
      );
    }
  }
}

function checkDoLookupFunction(integration: Integration, result: ValidationResult) {
  if (typeof integration.doLookup !== 'function') {
    result.errors.push('Missing required doLookup function');
  } else {
    if (integration.doLookup.length !== 3) {
      result.warnings.push(
        `doLookup function should accept exactly 3 parameters (entities, options, context), found ${integration.doLookup.length}`
      );
    }
  }
}

function checkOnMessageFunction(integration: Integration, result: ValidationResult) {
  if (integration.onMessage !== undefined) {
    if (typeof integration.onMessage !== 'function') {
      result.errors.push('onMessage must be a function if present');
    } else if (integration.onMessage.length !== 3) {
      result.warnings.push(
        `onMessage function should accept exactly 3 parameters (payload, options, context), found ${integration.onMessage.length}`
      );
    }
  }
}

function validateFunctionSignatures(integration: Integration, result: ValidationResult) {
  const mockLogger = {
    child: () => mockLogger,
    info: () => {},
    debug: () => {},
    warn: () => {},
    error: () => {},
    trace: () => {},
    fatal: () => {}
  } as unknown as Parameters<Integration['startup']>[0];

  const mockContext: IntegrationContext = createMockIntegrationContext();

  // Test startup return type
  if (typeof integration.startup === 'function') {
    try {
      const startupResult = integration.startup(mockLogger);
      if (!startupResult || typeof startupResult.then !== 'function') {
        result.errors.push('startup function must return a Promise');
      } else {
        // Prevent unhandled rejection if startup throws asynchronously
        startupResult.catch(() => {});
      }
    } catch (error) {
      result.warnings.push(`startup function threw error during validation: ${error}`);
    }
  }

  // Test doLookup return type
  if (typeof integration.doLookup === 'function') {
    try {
      const doLookupResult = integration.doLookup(
        [],
        { validatePayload: false },
        mockContext
      );
      const isValidReturn =
        Array.isArray(doLookupResult) ||
        doLookupResult === null ||
        doLookupResult === undefined ||
        (doLookupResult &&
          typeof doLookupResult === 'object' &&
          'name' in doLookupResult &&
          (doLookupResult as { name: unknown }).name === 'IntegrationError') ||
        // Check for promise
        (doLookupResult &&
          typeof (doLookupResult as { then: unknown }).then === 'function');

      if (!isValidReturn) {
        // It might be a promise that resolves to the valid return types, so checking if it's a promise is important.
        // The original code checked constructor name IntegrationError.
        // Let's refine this. doLookup MUST return a Promise.
        if (
          doLookupResult &&
          typeof (doLookupResult as { then: unknown }).then === 'function'
        ) {
          // It's a promise, which is good.
          (doLookupResult as Promise<unknown>).catch(() => {});
        } else {
          result.warnings.push(
            `doLookup should return a Promise, returned: ${typeof doLookupResult}`
          );
        }
      } else if (
        doLookupResult &&
        typeof (doLookupResult as { then: unknown }).then === 'function'
      ) {
        (doLookupResult as Promise<unknown>).catch(() => {});
      }
    } catch (error) {
      result.warnings.push(`doLookup function threw error during validation: ${error}`);
    }
  }

  // Test onMessage return type
  if (typeof integration.onMessage === 'function') {
    try {
      const onMessageResult = integration.onMessage(
        {},
        { validatePayload: false },
        mockContext
      );
      if (!onMessageResult || typeof onMessageResult.then !== 'function') {
        result.errors.push('onMessage function must return a Promise');
      } else {
        // Prevent unhandled rejection if onMessage throws asynchronously
        onMessageResult.catch(() => {});
      }
    } catch (error) {
      result.warnings.push(`onMessage function threw error during validation: ${error}`);
    }
  }
}

function checkIntegrationObject(integration: Integration, result: ValidationResult) {
  // Check if someone accidentally exported { integration: { ... } } instead of { ... }
  if ('integration' in integration) {
    const integrationObj = (integration as { integration: unknown }).integration;
    if (
      integrationObj &&
      typeof integrationObj === 'object' &&
      'startup' in integrationObj &&
      typeof (integrationObj as { startup: unknown }).startup === 'function' &&
      'doLookup' in integrationObj &&
      typeof (integrationObj as { doLookup: unknown }).doLookup === 'function'
    ) {
      result.warnings.push(
        'Detected potential incorrect export structure. The integration seems to be nested under an "integration" property. Ensure you are exporting the integration object directly (e.g. export = { ... }).'
      );
    }
  }
}
