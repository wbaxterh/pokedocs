import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import type { PokedocsPresetOptions } from '@pokedocs/preset';
import { themes as prismThemes } from 'prism-react-renderer';

// The dogfood gate (S0.3.1): this site is built from the packages in this
// repo and is the canary for upstream Docusaurus upgrades. The config we
// ship is the config we live with — and since S1.2.1 it is one preset
// entry: branding (F1.4), build-time mermaid (F1.3), and local search
// (F1.6) are all active below with zero site-side wiring. The favicon is
// injected from branding; markdown.mermaid and theme-mermaid must stay
// OFF (they would consume the fences before rehype sees them).
const config: Config = {
  title: 'PokeDocs',
  tagline: 'Docs that humans love — and agents can actually read.',

  future: {
    v4: true,
  },

  url: 'https://wbaxterh.github.io',
  baseUrl: '/pokedocs/',
  organizationName: 'wbaxterh',
  projectName: 'pokedocs',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      '@pokedocs/preset',
      {
        branding: {
          brandColor: '#D8232A',
          logo: 'img/logo-badge.svg',
        },
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/wbaxterh/pokedocs/tree/main/docs-site/',
        },
        // F2.2 dogfood: the "every page carries a description" convention
        // is now a build-enforced contract, not a request.
        frontmatterSchema: {
          schemas: [
            {
              include: '**',
              fields: {
                description: { type: 'string', required: true },
              },
            },
          ],
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies PokedocsPresetOptions,
    ],
  ],

  themeConfig: {
    image: 'img/logo-badge.svg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'PokeDocs',
      logo: {
        alt: 'PokeDocs badge logo',
        src: 'img/logo-badge.svg',
      },
      items: [
        {
          href: 'https://github.com/wbaxterh/pokedocs',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Project',
          items: [
            { label: 'GitHub', href: 'https://github.com/wbaxterh/pokedocs' },
            {
              label: 'PRD',
              href: 'https://github.com/wbaxterh/pokedocs/blob/main/docs/prd/pokedocs-prd-v1.md',
            },
            {
              label: 'Issues',
              href: 'https://github.com/wbaxterh/pokedocs/issues',
            },
          ],
        },
      ],
      copyright: `MIT © ${new Date().getFullYear()} PokeDocs`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
