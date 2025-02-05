---
title: Getting Started
group: Documents
category: Guides
---

The Polarity Integration Utils library provides a set of utilities to help you build integrations quickly and efficiently for Polarity.  The core of the library is the {@link PolarityRequest} class which provides a simple interface for making HTTP requests and handling responses.

## Installation

You can leverage the Polarity Request library in your integration by installing the `polarity-integration-utils` package.  You can install the package using `npm` which will also update your `package.json` like this:

```bash
npm install polarity-integration-utils
```

Additionally, you can manually add the dependency to your `package.json` the `dependencies`:

```
{
  "dependencies": "polarity-integration-utils": "^2.0.0"
}
```

When manually adding the dependency, you will need to run `npm install` to install the package.

## Guides

* Polarity Request