# System Patterns

## Architecture

The library is designed with a modular architecture, centered around robust typing and standardized testing.

### Core Components

- **PolarityRequest:** A resilient HTTP client wrapper around `node-fetch` that handles authentication, retries, rate limiting, and error normalization.
- **Logger:** A structured logging utility that integrates with the Polarity server's logging system.
- **Cache:** An in-memory caching mechanism to optimize performance and reduce API calls.

### Type System & Validation (New)

- **Zod as Source of Truth:** We use `zod` to define the runtime schema of all integration data structures (e.g., `Entity`, `IntegrationOption`, `LookupResult`).
- **Inferred Types:** TypeScript interfaces are inferred directly from these Zod schemas (`z.infer<typeof Schema>`). This guarantees that compile-time types always match runtime validation logic.
- **Runtime Validation:** The library exposes validation functions that enforce these schemas at runtime, catching data issues before they reach the Polarity server.

### Testing Framework (New)

- **Test Factory Pattern:** We use a factory function (`createIntegrationTests`) to generate a standardized Jest test suite for any integration.
  - **Input:** The integration module (functions) and a declarative definition of test cases.
  - **Output:** A complete Jest `describe` block with tests for `doLookup`, `startup`, `onMessage`, etc.
- **Declarative Tests:** Tests are defined as data objects (input entity, options, expected result) rather than imperative code.
- **Mocking Strategy:**
  - `createMockIntegrationContext`: Creates a fully typed mock of the `Logger` and `PolarityRequest` for passing into integration functions.
  - `mockRequest`: Utilities for intercepting `PolarityRequest` calls and simulating API responses.

## Architectural Principles

- **Type Safety:** Use strict TypeScript configurations to prevent runtime errors.
- **Single Source of Truth:** Define constraints once (in Zod) and derive types and validation logic from there.
- **Developer Ergonomics:** Reduce boilerplate for common tasks (like testing and validation) so developers can focus on business logic.

## Component Relationships

- **Integration Module:** The user's code, which implements specific functions (`doLookup`, etc.).
- **Integration Utils:** The library that consumes the Integration Module, validates its inputs/outputs using Zod schemas, and provides helpers (Logger, Request) for it to use.
- **Test Runner:** The `createIntegrationTests` utility acts as a bridge, running the Integration Module against defined test cases and asserting the results match the Zod schemas.
