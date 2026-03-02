# Test Suite Requirements

## 1. Scope of the Test Suite

### What it will do:

- Provide a clear, consistent, and easy-to-use testing framework for Polarity integrations.
- Validate that an integration adheres to the required structure and patterns.
- Automate the testing of core integration functionality, such as `doLookup`, `onMessage`, etc.
- Reduce boilerplate code in integration test suites.
- Provide clear and actionable error messages for failing tests.

### What it won't do:

- Test the internal logic of an integration's custom functions.
- Test the external API that an integration connects to.
- Replace the need for developers to write their own unit tests for complex business logic.

## 2. Review of Current Types and Checks

The library currently uses standard TypeScript types. We've decided to adopt `zod` to provide a single source of truth for both runtime validation and type generation.

### The `zod` and `z.infer` Approach:

- **Single Source of Truth:** We will define `zod` schemas for all our data structures in `lib/types.ts`.
- **Type Inference:** We will use `zod`'s built-in `z.infer` feature to generate our TypeScript types directly from these schemas. This eliminates the need for a separate type generation library and prevents any duplication of type definitions.
- **Powerful Validation:** The test suite will import and use these `zod` schemas to perform robust runtime validation of inputs, outputs, and function parameters. This will provide clear and detailed error messages, improving the developer experience.
- **Enforced Standards:** This approach ensures that all integrations are held to a consistent and reliable data contract, enforced by the test suite.

## 3. Review of Possible Technologies

Based on the brainstorming in `activeContext.md`, there are three main options for the test suite's architecture:

### Option 1: The "Test Suite in a Box"

- **Concept:** A single function that runs a full test suite based on a configuration object.
- **Pros:** Extremely easy to use, enforces consistency, minimal boilerplate.
- **Cons:** Less flexible, might hide too much of the underlying process.

### Option 2: The "Test Factory"

- **Concept:** A factory function that generates a set of Jest tests.
- **Pros:** More flexible than Option 1, still reduces boilerplate, allows for custom tests.
- **Cons:** Slightly more complex to use.

### Option 3: The "Enhanced Utilities" Approach

- **Concept:** Enhance the existing testing utilities without creating a full framework.
- **Pros:** Builds on the existing foundation, maximum flexibility.
- **Cons:** Does the least to reduce boilerplate, doesn't enforce a consistent pattern.

### Recommendation:

A hybrid approach, combining the "Test Factory" (Option 2) with "Enhanced Utilities" (Option 3), is the best path forward. This will provide a solid foundation of powerful, flexible utilities (like custom Jest matchers and mock factories) that can be used to build a more structured, yet still flexible, test factory. This approach gives developers the option to use the test factory for common scenarios or drop down to the enhanced utilities for more complex, custom testing needs.

## 4. Granular Requirements

### Test Factory (`createIntegrationTests`)

- **`createIntegrationTests(integration, { mocks = { 'polarity-request': true } })`:**
  - **Inputs:**
    - `integration`: The integration module.
    - `mocks`: An optional object to control mocking behavior. By default, it will mock `polarity-request`. Developers can override this to disable the built-in mock (e.g., `{ 'polarity-request': false }`) if they are using a different request library and managing their own mocks.
  - **Output:** An object containing test functions for each of the integration's methods (e.g., `testDoLookup`, `testOnMessage`).
  - **Validation:**
    - Should validate that the integration module has the required exports (e.g., `startup`, `doLookup`).
    - Should validate the integration's `config.json` (if provided).

- **`testDoLookup(description, { entities, options, expected })`:**
  - **Inputs:**
    - `description`: A string describing the test case.
    - `entities`: An array of entity objects.
    - `options`: The user options object.
    - `expected`: The expected array of result objects.
  - **Functionality:**
    - Should mock the `polarity-request` module.
    - Should call the `doLookup` method with the provided entities and options.
    - Should validate the result against the `DoLookupResultSchema`.
    - Should compare the result to the `expected` value.

- **`testOnMessage(description, { command, args, expected })`:**
  - **Inputs:**
    - `description`: A string describing the test case.
    - `command`: The name of the onMessage command to execute.
    - `args`: The arguments to pass to the command.
    - `expected`: The expected result.
  - **Functionality:**
    - Should mock the `polarity-request` module.
    - Should call the `onMessage` method with the provided command and arguments.
    - Should validate and compare the result to the `expected` value.

### Enhanced Utilities

- **`mockRequest()`:**
  - A utility function for mocking the `polarity-request` module.
  - Should allow for easy configuration of mock responses.

- **`createEntity(type, value)`:**
  - A factory function for creating entity objects.
  - Should simplify the process of creating entities for test cases.

- **`createMockIntegrationContext()`:**
  - A factory function for creating a mock integration context object.
  - Should include a mock cache that can be configured for test cases.
  - Should allow for easy spying on cache methods (e.g., `get`, `set`, `del`).

- **`validateIntegration(integration)`:**
  - A utility function to validate an integration module.
  - Should check for the required exports (e.g., `startup`, `doLookup`).
  - Should validate the `config.json` (if provided).

- **Custom Jest Matchers:**
  - `toBeValidResult()`: A matcher to validate a result object against the `ResultSchema`.
  - `toBeValidDoLookupResult()`: A matcher to validate a `doLookup` result against the `DoLookupResultSchema`.
