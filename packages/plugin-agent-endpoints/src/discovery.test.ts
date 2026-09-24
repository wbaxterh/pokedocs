import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  AGENT_ARTIFACTS,
  AGENT_SKILLS_SCHEMA,
  agentLinkHeader,
  agentSkillsIndex,
  frontmatterDescription,
  isValidSkillName,
  pokedocsManifest,
  SKILL_PAGE_LIST_LIMIT,
  sha256Digest,
  skillDescription,
  skillHref,
  skillMd,
  skillNameFor,
} from './discovery.js';
import type { AgentDoc } from './emit.js';

const SITE = {
  url: 'https://wbaxterh.github.io',
  baseUrl: '/pokedocs/',
  title: 'PokeDocs',
  tagline: 'Docs agents can read.',
};

function doc(n: number): AgentDoc {
  return {
    title: `Page ${n}`,
    description: `About ${n}.`,
    permalink: `/pokedocs/page-${n}`,
    markdown: `# Page ${n}\n`,
  };
}

describe('skill names (S3.2.1)', () => {
  it.each([
    ['PokeDocs', 'pokedocs'],
    ['Wes RealDefense Docs!', 'wes-realdefense-docs'],
    ['  --Crème Brûlée--  ', 'creme-brulee'],
    ['日本語', 'docs'],
  ])('slugs %j to %j', (title, slug) => {
    expect(skillNameFor(title)).toBe(slug);
    expect(isValidSkillName(skillNameFor(title))).toBe(true);
  });

  it('never ends a 64-char cut on a hyphen', () => {
    const name = skillNameFor(`${'a'.repeat(63)} b`);
    expect(name).toBe('a'.repeat(63));
    expect(isValidSkillName(name)).toBe(true);
  });

  it.each(['-lead', 'trail-', 'dou--ble', 'Upper', 'a'.repeat(65), ''])(
    'rejects %j',
    (name) => {
      expect(isValidSkillName(name)).toBe(false);
    },
  );
});

describe('SKILL.md (S3.2.1)', () => {
  const skill = { name: 'pokedocs', description: 'Use when: "quoted" text.' };

  it('opens with spec frontmatter and a quoted description', () => {
    const md = skillMd(SITE, [doc(1)], skill);
    expect(md.startsWith('---\nname: pokedocs\n')).toBe(true);
    expect(md).toContain('description: "Use when: \\"quoted\\" text."\n---');
    expect(frontmatterDescription(md)).toBe(skill.description);
  });

  it('gives the fetch protocol with absolute URLs', () => {
    const md = skillMd(SITE, [doc(1)], skill);
    expect(md).toContain('https://wbaxterh.github.io/pokedocs/llms.txt');
    expect(md).toContain('https://wbaxterh.github.io/pokedocs/page-1.md');
    expect(md).toContain('https://wbaxterh.github.io/pokedocs/llms-full.txt');
    expect(md).toContain(
      '- [Page 1](https://wbaxterh.github.io/pokedocs/page-1.md): About 1.',
    );
  });

  it('defers the page list to llms.txt on large sites', () => {
    const docs = Array.from({ length: SKILL_PAGE_LIST_LIMIT + 1 }, (_, i) =>
      doc(i),
    );
    const md = skillMd(SITE, docs, skill);
    expect(md).not.toContain('## Pages');
    expect(md).toContain(`The site has ${docs.length} pages`);
  });

  it('generates a description within the 1024-char limit', () => {
    expect(skillDescription(SITE, 12)).toBe(
      'Use when a task involves PokeDocs: Docs agents can read. Explains how to read its documentation (12 pages, each available as markdown) so answers come from the docs rather than memory.',
    );
    const long = skillDescription({ ...SITE, tagline: 'x'.repeat(2000) }, 1);
    expect(long.length).toBe(1024);
  });
});

describe('hand-written SKILL.md descriptions', () => {
  it.each([
    ['description: plain words', 'plain words'],
    ['description: "double \\"quoted\\""', 'double "quoted"'],
    ["description: 'it''s single'", "it's single"],
  ])('reads %j', (line, expected) => {
    expect(frontmatterDescription(`---\nname: x\n${line}\n---\n# X\n`)).toBe(
      expected,
    );
  });

  it.each(['description: >', 'description: |-', 'name: only'])(
    'returns null for %j',
    (line) => {
      expect(frontmatterDescription(`---\n${line}\n---\n`)).toBeNull();
    },
  );
});

describe('agent-skills index (S3.2.1)', () => {
  it('matches discovery RFC v0.2.0', () => {
    const bytes = 'hello';
    const index = JSON.parse(
      agentSkillsIndex([
        {
          name: 'pokedocs',
          description: 'd',
          url: skillHref('/pokedocs/', 'pokedocs'),
          digest: sha256Digest(bytes),
        },
      ]),
    );
    expect(index.$schema).toBe(AGENT_SKILLS_SCHEMA);
    expect(index.skills).toEqual([
      {
        name: 'pokedocs',
        type: 'skill-md',
        description: 'd',
        url: '/pokedocs/.well-known/agent-skills/pokedocs/SKILL.md',
        digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
      },
    ]);
    expect(index.skills[0].digest).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

describe('pokedocs.json (S3.2.1)', () => {
  it('versions the format and lists absolute artifact URLs', () => {
    const manifest = JSON.parse(
      pokedocsManifest(SITE, {
        generator: '@pokedocs/plugin-agent-endpoints@0.3.0',
        pageCount: 10,
        agentSkills: true,
      }),
    );
    expect(manifest.pokedocs).toBe(1);
    expect(manifest.site.url).toBe('https://wbaxterh.github.io/pokedocs/');
    expect(manifest.artifacts).toMatchObject({
      llmsTxt: 'https://wbaxterh.github.io/pokedocs/llms.txt',
      llmsFullTxt: 'https://wbaxterh.github.io/pokedocs/llms-full.txt',
      pagesJson: 'https://wbaxterh.github.io/pokedocs/pages.json',
      agentSkills:
        'https://wbaxterh.github.io/pokedocs/.well-known/agent-skills/index.json',
    });
  });

  it('links every manifest artifact that has a rel, and the manifest itself (S3.2.4)', () => {
    const manifest = JSON.parse(
      pokedocsManifest(SITE, {
        generator: 'g',
        pageCount: 1,
        agentSkills: true,
      }),
    );
    const link = agentLinkHeader('/pokedocs/');
    for (const artifact of AGENT_ARTIFACTS) {
      if (artifact.rel === null) {
        expect(link).not.toContain(artifact.file);
        continue;
      }
      expect(link).toContain(
        `</pokedocs/${artifact.file}>; rel="${artifact.rel}"`,
      );
      if (artifact.key !== 'manifest') {
        expect(manifest.artifacts[artifact.key]).toBe(
          `https://wbaxterh.github.io/pokedocs/${artifact.file}`,
        );
      }
    }
    expect(agentLinkHeader('/', { agentSkills: false })).not.toContain(
      'agent-skills',
    );
  });

  it('omits agentSkills when the skill is off', () => {
    const manifest = JSON.parse(
      pokedocsManifest(SITE, {
        generator: 'g',
        pageCount: 0,
        agentSkills: false,
      }),
    );
    expect(manifest.artifacts.agentSkills).toBeUndefined();
  });
});
