# Product Context

## Problem Space

Developing Polarity integrations can be repetitive and error-prone. Developers often rewrite the same boilerplate code for handling authentication, making API requests, and managing errors. This slows down development and leads to inconsistencies across integrations.

Furthermore, ensuring that an integration handles all edge cases and conforms to the Polarity server's data contract is challenging without a strict type system and standardized validation logic.

## Solution

The Polarity Integration Utilities library (v2) provides a standardized, type-safe foundation for building integrations.

- **Runtime Validation:** Powered by Zod, ensuring that data flowing in and out of the integration matches expectations.
- **Declarative Testing:** A simplified testing framework that allows developers to define test cases as data, reducing boilerplate and encouraging comprehensive test coverage.
- **Core Utilities:** Pre-built, hardened components for HTTP requests (`PolarityRequest`), logging (`Logger`), and caching (`Cache`).

## User Experience Goals

- **Developer-Friendly:** The library should be easy to learn and use, with clear documentation and intuitive APIs.
- **Type-Safe:** Leverage TypeScript and Zod to catch errors at compile time and runtime, providing developers with confidence in their code.
- **Robust:** The utilities should be well-tested and reliable, handling edge cases (like retries and rate limits) automatically.
- **Opinionated and Strict:** The library enforces a clear structure and strict data contracts, streamlining development and ensuring compatibility with the Polarity server.
