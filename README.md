# Polarity Integration Utils

This library is intended for use in development of Polarity Integrations.

## Documentation

Documentation for this library can be found at: https://polarityio.github.io/polarity-integration-utils/

## Building the Library

### Prerequisites
| Tool | Version | Notes |
| ---- | ------- | ----- |
| Node | 18.x    | `nvm install 18 && nvm use 18` recommended |
| npm  | 9.x     | Ships with Node 18 |

### Install Dependencies
    npm ci

### Build
    npm run build

### Run Tests
    npm test

### Linting / Formatting
    npm run lint
    npm run lint:fix
    npm run format
    npm run format:check

### Docs
    npm run docs

### Continuous Integration
All pull-requests run the same **build → lint → test** pipeline in GitHub Actions.  
Ensure local runs are green before opening a PR.
