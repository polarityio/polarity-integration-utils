---
title: Getting Started
group: Documents
category: Guides
---

The Polarity Integration Utils library provides a set of utilities to help you build integrations quickly and efficiently for Polarity. The core of the library is the {@link PolarityRequest} class which provides a simple interface for making HTTP requests and handling responses.

## Installation

Install `polarity-integration-utils` and its peer dependency `@polarityio/integration-types`:

```bash
npm install polarity-integration-utils @polarityio/integration-types
```

Or manually add both to your `package.json`:

```json
{
  "dependencies": {
    "polarity-integration-utils": "^4.0.0",
    "@polarityio/integration-types": "^1.1.0"
  }
}
```

When manually adding dependencies, run `npm install` to install them.

## Guides

- [Polarity Request](./polarity-request.md) - HTTP request utilities for integrations
- [Cache](./cache.md) - Hierarchical caching with global, integration, and user scopes
- [Testing](./testing.md) - Testing utilities for integrations
