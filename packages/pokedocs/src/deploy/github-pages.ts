/**
 * GitHub Pages target (S1.7.1): the same workflow shape that deploys the
 * PokeDocs dogfood site on every merge — checkout, npm install, chromium
 * for build-time mermaid (cached), build, upload-pages-artifact,
 * deploy-pages. Non-Actions setups also get .nojekyll, and --domain
 * writes the CNAME.
 */

import type { DeployTarget } from './targets.js';

const WORKFLOW = `name: Deploy Docs

# Publishes to GitHub Pages on every push to main. One-time setup:
# repo Settings → Pages → Source: "GitHub Actions".

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: deploy-docs
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Cache playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-\${{ runner.os }}-\${{ hashFiles('package-lock.json') }}
      # Mermaid renders at build time via chromium
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: build

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
`;

export const githubPagesTarget: DeployTarget = {
  name: 'github-pages',
  description: 'GitHub Actions workflow publishing to GitHub Pages',
  files({ domain }) {
    return [
      { path: '.github/workflows/deploy.yml', content: WORKFLOW },
      // Harmless under actions/deploy-pages; protects anyone who later
      // serves the build/ dir from a branch, where Jekyll would eat
      // underscore-prefixed asset paths.
      { path: 'static/.nojekyll', content: '' },
      ...(domain ? [{ path: 'static/CNAME', content: `${domain}\n` }] : []),
    ];
  },
  nextSteps({ domain, baseUrl }) {
    const lines = [
      'Push to main, then set repo Settings → Pages → Source to "GitHub Actions".',
      domain
        ? `Custom domain: set \`url: 'https://${domain}'\` and \`baseUrl: '/'\` in docusaurus.config.ts, and configure the domain under Settings → Pages.`
        : `Project pages serve from https://<owner>.github.io/<repo>/ — make sure url/baseUrl match (current baseUrl: ${baseUrl}).`,
    ];
    return lines.join('\n');
  },
};
