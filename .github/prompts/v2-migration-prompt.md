# Polarity Integration v2 Migration Prompt

You are tasked with migrating an existing Polarity integration to be v2 compliant. This migration involves converting JavaScript to TypeScript, implementing comprehensive Jest tests, and ensuring the integration satisfies the `Integration` interface from `polarity-integration-utils`, while **preserving all existing functionality**.

## CRITICAL MIGRATION RULES

### ✅ PRESERVE (DO NOT MODIFY)

- **External API endpoints and request structures**
- **Core business logic and data processing**
- **Entity lookup behavior and response formats**
- **Option validation logic and error messages**
- **Caching strategies and cache keys**
- **Logging patterns and message content**
- **Integration configuration (config.json structure)**
- **Template rendering logic and display data**

### 🔄 MIGRATE (CONVERT AND ENHANCE)

- **JavaScript files to TypeScript with proper types**
- **Add comprehensive Jest test coverage**
- **Implement runtime validation testing**
- **Add proper error handling using IntegrationError**
- **Convert to polarity-integration-utils patterns**
- **Add Schemas and Type definitions for request and response objects**
- **Ensure Integration interface compliance**

## Migration Workflow

### Phase 1: Analysis and Planning

1. **Analyze Current Integration Structure**
   - Examine all JavaScript files and their functions
   - Document current entity types and lookup flows
   - Identify all integration options and validation rules
   - Map out external API calls and data transformations
   - Note any existing error handling patterns

2. **Create Migration Plan**
   - List all files that need TypeScript conversion
   - Identify which functions map to Integration interface methods
   - Document any custom logic that needs preservation
   - Plan test coverage strategy for all functionality

### Phase 2: TypeScript Conversion

1. **Set Up TypeScript Infrastructure**

   ```json
   // Ensure package.json includes:
   {
     "devDependencies": {
       "@types/node": "^20.0.0",
       "typescript": "^5.0.0",
       "ts-jest": "^29.0.0",
       "jest": "^29.0.0"
     }
   }
   ```

2. **Convert Main Integration File**
   - Convert `integration.js` to `integration.ts`
   - Implement the Integration interface:

   ```typescript
   import {
     Integration,
     DoLookupUserOptions,
     Entity,
     ValidateOptionsUserOptions
   } from 'polarity-integration-utils';
   import { IntegrationContext as Context } from 'polarity-integration-utils/context';
   import { Logger as PolarityLogger } from 'polarity-integration-utils/logging';

   // Define integration-specific option types
   interface IntegrationOptions extends DoLookupUserOptions {
     // Add specific options based on existing config.json
   }

   // Implement required functions
   async function startup(logger: PolarityLogger): Promise<any>;
   async function doLookup(
     entities: Entity[],
     options: IntegrationOptions,
     context: Context
   ): Promise<any>;
   function validateOptions(
     options: ValidateOptionsUserOptions,
     context: Context
   ): IntegrationError[];

   // Add optional functions if they exist in original
   async function onMessage(
     payload: any,
     options: IntegrationOptions,
     context: Context
   ): Promise<any>;
   async function onDetails(
     lookupObject: any,
     options: IntegrationOptions,
     context: Context
   ): Promise<any>;
   ```

3. **Convert Supporting Files**
   - Convert any utility files to TypeScript
   - Add proper type definitions for all data structures
   - Preserve all existing business logic exactly

4. **Update Request Handling**
   - Replace request libraries with PolarityRequest
   - Preserve all existing API endpoints and request structures
   - Maintain exact same request/response handling logic

   ```typescript
   import { PolarityRequest } from 'polarity-integration-utils/requests';

   // Convert existing request patterns like:
   // const response = await request.get(options);
   // To:
   const polarityRequest = new PolarityRequest(context.logger);
   const response = await polarityRequest.get({
     uri: endpoint, // Keep same endpoints
     headers: headers, // Keep same headers
     json: true
   });
   ```

5. **Update Error Handling**
   - Convert custom errors to IntegrationError
   - Preserve exact same error messages and conditions

   ```typescript
   import { IntegrationError } from 'polarity-integration-utils/errors';

   // Convert patterns like:
   // throw new Error("API key is required");
   // To:
   return new IntegrationError('API key is required', {
     key: 'apiKey',
     title: 'Configuration Error'
   });
   ```

6. **Update Logging**
   - Replace console.log with context.logger
   - Preserve same logging content and levels
   ```typescript
   // Convert patterns like:
   // console.log("Processing entities:", entities.length);
   // To:
   context.logger.info('Processing entities', { entityCount: entities.length });
   ```

### Phase 3: Jest Test Implementation

1. **Set Up Jest Configuration**

   ```javascript
   // jest.config.js
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'node',
     collectCoverage: true,
     coverageReporters: ['text-summary', 'html'],
     coverageDirectory: 'coverage'
   };
   ```

2. **Implement Runtime Validation Test (MANDATORY)**

   ```typescript
   // test/runtime-validation.test.ts
   import { validateIntegration } from 'polarity-integration-utils/testing';
   import integration from '../src/integration';
   import config from '../config/config.json';

   describe('Runtime Validation', () => {
     test('should pass runtime validation checks', () => {
       const result = validateIntegration(integration, config);
       expect(result.isValid).toBe(true);
       if (!result.isValid) {
         console.error('Validation errors:', result.errors);
       }
       expect(result.errors).toEqual([]);
     });
   });
   ```

3. **Implement Comprehensive Functional Tests**

   ```typescript
   // test/integration.test.ts
   import {
     createEntity,
     createMockIntegrationContext
   } from 'polarity-integration-utils/testing';
   import integration from '../src/integration';

   describe('Integration Functionality', () => {
     let context;
     let options;

     beforeEach(() => {
       context = createMockIntegrationContext();
       options = {
         // Add all required options based on config.json
       };
     });

     describe('doLookup', () => {
       test('should handle supported entity types', async () => {
         // Test each entity type from config.json
         const entities = [createEntity('IPv4', '8.8.8.8')];
         const result = await integration.doLookup(entities, options, context);

         expect(result).toBeDefined();
         // Verify response structure matches original behavior
       });

       test('should handle empty results gracefully', async () => {
         // Test scenarios that should return no results
       });

       test('should handle API errors appropriately', async () => {
         // Mock API failures and verify error handling
       });
     });

     describe('validateOptions', () => {
       test('should validate all required options', () => {
         const errors = integration.validateOptions({}, context);
         // Verify same validation rules as original
       });

       test('should accept valid configurations', () => {
         const errors = integration.validateOptions(options, context);
         expect(errors).toEqual([]);
       });
     });

     // Add tests for onMessage, onDetails if they exist
   });
   ```

4. **Test Edge Cases and Error Scenarios**
   - Test rate limiting behavior
   - Test timeout handling
   - Test malformed API responses
   - Test invalid entity formats
   - Test network connectivity issues

### Phase 4: Validation and Verification

1. **Verify Integration Interface Compliance**
   - Ensure all required methods are implemented
   - Verify proper return types and error handling
   - Test with actual Integration interface validation

2. **Functional Verification**
   - Compare outputs with original integration
   - Test all supported entity types
   - Verify caching behavior remains the same
   - Test option validation produces identical results

3. **Performance Verification**
   - Ensure response times are comparable
   - Verify caching effectiveness
   - Test with realistic entity volumes

### Phase 5: Final Migration Steps

1. **Update Build Configuration**

   ```json
   // package.json scripts
   {
     "scripts": {
       "build": "tsc -p tsconfig.build.json",
       "test": "jest --coverage",
       "test:watch": "jest --watch",
       "lint": "eslint src/ --ext .ts"
     }
   }
   ```

2. **Update Documentation**
   - Add JSDoc comments to all functions
   - Document any TypeScript-specific considerations
   - Update README with new build/test instructions

3. **Cleanup**
   - Remove original JavaScript files after verification
   - Update .gitignore for TypeScript build artifacts
   - Ensure all dependencies are properly specified

## Migration Verification Checklist

### ✅ Functionality Preservation

- [ ] All entity types process identically to original
- [ ] API requests use same endpoints with same parameters
- [ ] Response processing produces identical output structures
- [ ] Error conditions trigger same error messages
- [ ] Option validation has same rules and error messages
- [ ] Caching behavior is identical (same keys, same TTL)
- [ ] Template rendering produces same display data

### ✅ TypeScript Implementation

- [ ] All files converted to TypeScript with proper types
- [ ] Integration interface properly implemented
- [ ] No `any` types used without justification
- [ ] All external API responses properly typed
- [ ] Proper error handling with IntegrationError

### ✅ Testing Coverage

- [ ] Runtime validation test passes
- [ ] All integration functions have test coverage
- [ ] Edge cases and error scenarios tested
- [ ] API mocking properly implemented
- [ ] Test coverage meets or exceeds 90%

### ✅ polarity-integration-utils Integration

- [ ] Using PolarityRequest for all HTTP operations
- [ ] Using context.logger for all logging
- [ ] Using IntegrationError for error handling
- [ ] Using testing utilities for test setup
- [ ] Proper cache usage patterns

## Common Migration Pitfalls to Avoid

1. **Don't Change API Logic**: Preserve exact same API endpoints, parameters, and response processing
2. **Don't Alter Entity Processing**: Keep same entity type support and processing logic
3. **Don't Change Option Names**: Keep same option keys and validation rules from config.json
4. **Don't Modify Error Messages**: Users expect same error messages for same conditions
5. **Don't Change Cache Keys**: Existing cached data should remain valid
6. **Don't Skip Runtime Validation**: This test is mandatory for v2 compliance
7. **Don't Use Direct HTTP Libraries**: Always use PolarityRequest from utils package

## Success Criteria

The migration is successful when:

1. Runtime validation test passes
2. All functional tests pass with >90% coverage
3. Integration produces identical outputs for same inputs as original
4. Integration satisfies the Integration interface requirements
5. All TypeScript compilation passes without errors
6. Performance characteristics are comparable to original

## Final Deliverables

After migration completion, ensure these files exist:

- `src/integration.ts` - Main TypeScript integration file
- `src/types.ts` - Type definitions (if complex types needed)
- `test/integration.test.ts` - Comprehensive functional tests
- `test/runtime-validation.test.ts` - Runtime validation test
- `tsconfig.json` and `tsconfig.build.json` - TypeScript configuration
- `jest.config.js` - Jest test configuration
- Updated `package.json` with TypeScript dependencies and scripts

Remember: The goal is v2 compliance while maintaining 100% functional compatibility with the original integration.
