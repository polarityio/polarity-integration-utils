# Polarity Integration Utils

This library is intended for use in development of Polarity Integrations.



## Contribution Instructions

> NOTE: Don't forget to add your implementations to the `./test/index.test.js` to ensure your implementation is accessible from the main index.js

### Continuous Integration

All pull requests run the **build → lint → test** pipeline via GitHub Actions. Ensure local runs are green before opening a PR.

#### PR Checks

Pull requests targeting `develop`, `main`, or any `support/*` branch trigger the shared build workflow which runs linting, tests with coverage, and uploads results to Codecov.

#### Release (main branch)

Pushes to `main` trigger the full release workflow:

1. **Build & test** — runs the shared build pipeline.
2. **Release** — creates a GitHub Release tagged with the package version (e.g., `v3.1.6`), marks it as the latest release, and publishes to npm under the `latest` dist-tag.
3. **Deploy docs** — after a successful release, builds TypeDoc documentation and deploys to GitHub Pages.

#### Release (support branches)

Pushes to `support/*` branches (e.g., `support/1.0`, `support/2.0`) trigger the same release workflow with the following differences:

- **Docs are not deployed** — only `main` publishes documentation to GitHub Pages.
- **GitHub Release is not marked as latest** — the release is still created with the full version tag (e.g., `v2.0.9`) but will not appear as the "Latest" release in the GitHub UI.
- **npm publish uses a version-specific dist-tag** — instead of `latest`, support branches publish under `v{major}-latest` (e.g., `v2-latest`, `v1-latest`). This ensures `npm install polarity-integration-utils` continues to resolve to the current major version while older versions remain installable via their dist-tag (e.g., `npm install polarity-integration-utils@v2-latest`).
