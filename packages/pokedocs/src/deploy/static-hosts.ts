/**
 * Netlify, Cloudflare Pages, and Vercel targets (S3.2.4). These hosts
 * build Docusaurus with zero config, so the only thing to generate is the
 * agent `Link` header. None of them can negotiate `Accept: text/markdown`
 * from static config (that needs edge code, S3.2.5), so no `Vary` either.
 */

import { agentLinkHeader } from '@pokedocs/plugin-agent-endpoints';
import type { DeployTarget } from './targets.js';

/**
 * Netlify and Cloudflare Pages read the same `_headers` format from the
 * publish directory; `static/` is copied there by the build.
 */
function headersFile(baseUrl: string, agentSkills?: boolean): string {
  return `# Agent discovery (PokeDocs S3.2.4): every response links the site's
# agent artifacts, so a client holding any URL can find the rest.
${baseUrl}*
  Link: ${agentLinkHeader(baseUrl, { agentSkills })}
`;
}

function vercelJson(baseUrl: string, agentSkills?: boolean): string {
  const config = {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    headers: [
      {
        source: `${baseUrl}(.*)`,
        headers: [
          { key: 'Link', value: agentLinkHeader(baseUrl, { agentSkills }) },
        ],
      },
    ],
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

function verifyStep(baseUrl: string): string {
  return `Verify after deploy: curl -sI https://<your-site>${baseUrl} | grep -i '^link'`;
}

export const netlifyTarget: DeployTarget = {
  name: 'netlify',
  description: 'Agent Link header for Netlify (static/_headers)',
  files({ baseUrl, agentSkills }) {
    return [
      { path: 'static/_headers', content: headersFile(baseUrl, agentSkills) },
    ];
  },
  nextSteps({ baseUrl }) {
    return [
      'Netlify detects Docusaurus on its own (build: npm run build, publish: build).',
      verifyStep(baseUrl),
    ].join('\n');
  },
};

export const cloudflarePagesTarget: DeployTarget = {
  name: 'cloudflare-pages',
  description: 'Agent Link header for Cloudflare Pages (static/_headers)',
  files({ baseUrl, agentSkills }) {
    return [
      { path: 'static/_headers', content: headersFile(baseUrl, agentSkills) },
    ];
  },
  nextSteps({ baseUrl }) {
    return [
      'In the Pages project, use the Docusaurus preset (build: npm run build, output: build).',
      verifyStep(baseUrl),
    ].join('\n');
  },
};

export const vercelTarget: DeployTarget = {
  name: 'vercel',
  description: 'Agent Link header for Vercel (vercel.json)',
  files({ baseUrl, agentSkills }) {
    return [{ path: 'vercel.json', content: vercelJson(baseUrl, agentSkills) }];
  },
  nextSteps({ baseUrl }) {
    return [
      'Vercel detects Docusaurus on its own. If you already had a vercel.json, merge its other keys back in.',
      verifyStep(baseUrl),
    ].join('\n');
  },
};
