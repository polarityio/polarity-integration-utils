# Polarity Integration Utils

This library is intended for use in development of Polarity Integrations.



## Contribution Instructions

> NOTE: Don't forget to add your implementations to the `./test/index.test.js` to ensure your implementation is accessible from the main index.js

## Developer

### Prerequisites
| Tool | Version | Notes |
| ---- | ------- | ----- |
| Node | 18.x    | `nvm install 18 && nvm use 18` recommended |
| npm  | 9.x     | Ships with Node 18 |

### Install
    npm ci

### Build
    npm run build

### Test
    npm test

### Lint / Format
    npm run lint
    npm run lint:fix
    npm run format
    npm run format:check

### Docs
    npm run docs

### Continuous Integration
All pull-requests run the same **build → lint → test** pipeline in GitHub Actions.  
Ensure local runs are green before opening a PR.
