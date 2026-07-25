import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { rehypeMermaidSsr } from '@pokedocs/plugin-mermaid-ssr';
import type { PokedocsPresetOptions } from '@pokedocs/preset';
import { compileBranding } from '@pokedocs/theme';
import { themes as prismThemes } from 'prism-react-renderer';

// The dogfood gate (S0.3.1): this site is built from the packages in this
// repo and is the canary for upstream Docusaurus upgrades. Once S1.2.1 lands,
// the classic-preset block below collapses into @pokedocs/preset with these
// options — the config we ship is the config we live with.
//
// Pillar 2 dogfood (F1.4): the site's entire brand is this one block — the
// compiled ladder is injected by the pokedocs-branding-css plugin below, and
// custom.css carries no Infima variables. Flip debug to true to print every
// computed shade during the build.
const branding = compileBranding(
  {
    brandColor: '#D8232A',
    logo: 'img/logo-badge.svg',
  } satisfies PokedocsPresetOptions['branding'],
  { debug: false },
);

const config: Config = {
  title: 'PokeDocs',
  tagline: 'Docs that humans love — and agents can actually read.',
  favicon: branding.favicon,

  future: {
    v4: true,
  },

  url: 'https://wbaxterh.github.io',
  baseUrl: '/pokedocs/',
  organizationName: 'wbaxterh',
  projectName: 'pokedocs',

  onBrokenLinks: 'throw',
  // F1.3 live: mermaid renders at build time via @pokedocs/plugin-mermaid-ssr
  // (see the docs preset options below). markdown.mermaid and theme-mermaid
  // must stay OFF — they would consume the fences before rehype sees them.

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    function pokedocsBrandingCss() {
      return {
        name: 'pokedocs-branding-css',
        injectHtmlTags: () => ({
          headTags: [{ tagName: 'style', innerHTML: branding.css }],
        }),
      };
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/wbaxterh/pokedocs/tree/main/docs-site/',
          beforeDefaultRehypePlugins: [[rehypeMermaidSsr, {}]],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
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
        src: branding.logo?.light ?? 'img/logo-badge.svg',
        srcDark: branding.logo?.dark,
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
