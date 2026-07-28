/**
 * Docker/nginx target (S1.7.2): a maintained multi-stage build — node +
 * chromium builder (build-time mermaid needs a browser), static files
 * behind unprivileged nginx. Non-root runtime, port 8080, try_files
 * derived from the site's configured baseUrl.
 */

import type { DeployTarget } from './targets.js';

function dockerfile(baseUrl: string): string {
  const mount = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '');
  return `# Build stage: node + chromium (mermaid renders to SVG at build time)
FROM node:22-bookworm AS builder
WORKDIR /site
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
RUN npx playwright install --with-deps chromium
COPY . .
# Site URL override at image build time (S1.7.3), e.g.
#   docker build --build-arg POKEDOCS_URL=https://docs.mycompany.dev .
ARG POKEDOCS_URL
ARG POKEDOCS_BASE_URL
ENV POKEDOCS_URL=\${POKEDOCS_URL} POKEDOCS_BASE_URL=\${POKEDOCS_BASE_URL}
RUN npm run build

# Runtime stage: static files behind unprivileged nginx (non-root, port 8080)
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /site/build /usr/share/nginx/html${mount}
EXPOSE 8080
`;
}

function nginxConf(baseUrl: string): string {
  const rootRedirect =
    baseUrl === '/'
      ? ''
      : `
  # The site lives under ${baseUrl} — bounce the bare root there.
  location = / {
    return 302 ${baseUrl};
  }
`;
  return `server {
  listen 8080;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  gzip on;
  gzip_types text/plain text/css application/javascript application/json image/svg+xml;

  error_page 404 ${baseUrl}404.html;
${rootRedirect}
  # Docusaurus emits a directory per route with an index.html; markdown
  # twins, llms.txt, and other agent artifacts are plain files.
  location ${baseUrl} {
    try_files $uri $uri/ =404;
  }
}
`;
}

const DOCKERIGNORE = `node_modules
build
.docusaurus
.git
`;

export const dockerTarget: DeployTarget = {
  name: 'docker',
  description: 'Multi-stage Dockerfile + non-root nginx for self-hosting',
  files({ baseUrl }) {
    return [
      { path: 'Dockerfile', content: dockerfile(baseUrl) },
      { path: 'nginx.conf', content: nginxConf(baseUrl) },
      { path: '.dockerignore', content: DOCKERIGNORE },
    ];
  },
  nextSteps({ baseUrl }) {
    return [
      'Build and run:',
      '  docker build -t my-docs .',
      '  docker run --rm -p 8080:8080 my-docs',
      `Then open http://localhost:8080${baseUrl}`,
    ].join('\n');
  },
};
