#!/usr/bin/env node
/**
 * create-pokedocs CLI (S1.1.3): interactive prompts with sensible
 * defaults, non-interactive flags, and `--yes` for a working default site.
 */

import readline from 'node:readline/promises';
import { parseArgs } from 'node:util';
import type { ScaffoldOptions } from './index.js';
import { SCAFFOLD_DEFAULTS, scaffold } from './index.js';

const USAGE = `Usage: create-pokedocs <directory> [options]

Options:
  --site-name <name>     Site display name (default: directory name)
  --tagline <text>       Landing hero tagline
  --brand-color <hex>    Primary brand color (default: ${SCAFFOLD_DEFAULTS.brandColor})
  --logo <path>          Logo file (.svg/.png) to copy in (default: generated)
  --deploy <target>      github-pages | docker | none (default: ${SCAFFOLD_DEFAULTS.deploy})
  --github-owner <name>  GitHub user/org (required for --deploy github-pages)
  --github-repo <name>   GitHub repo (default: directory name)
  -y, --yes              Accept defaults for everything not passed as a flag
  -h, --help             Show this help
`;

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const DEPLOY_TARGETS = ['github-pages', 'docker', 'none'] as const;

export function parseCliArgs(argv: string[]): {
  options: ScaffoldOptions | undefined;
  help: boolean;
} {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'site-name': { type: 'string' },
      tagline: { type: 'string' },
      'brand-color': { type: 'string' },
      logo: { type: 'string' },
      deploy: { type: 'string' },
      'github-owner': { type: 'string' },
      'github-repo': { type: 'string' },
      yes: { type: 'boolean', short: 'y', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    return { options: undefined, help: true };
  }
  const directory = positionals[0];
  if (!directory) {
    return { options: undefined, help: false };
  }
  if (
    values.deploy !== undefined &&
    !DEPLOY_TARGETS.includes(values.deploy as never)
  ) {
    throw new Error(
      `invalid --deploy ${JSON.stringify(values.deploy)} — expected ${DEPLOY_TARGETS.join(', ')}.`,
    );
  }
  return {
    help: false,
    options: {
      directory,
      siteName: values['site-name'],
      tagline: values.tagline,
      brandColor: values['brand-color'],
      logo: values.logo,
      deploy: values.deploy as ScaffoldOptions['deploy'],
      githubOwner: values['github-owner'],
      githubRepo: values['github-repo'],
      yes: values.yes,
    },
  };
}

/** Fill unset options by prompting; every prompt shows its default. */
async function promptForMissing(
  options: ScaffoldOptions,
): Promise<ScaffoldOptions> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const ask = async (question: string, fallback: string): Promise<string> => {
    const answer = (await rl.question(`${question} (${fallback}): `)).trim();
    return answer || fallback;
  };
  try {
    const filled = { ...options };
    const defaultName =
      options.directory.split('/').filter(Boolean).pop() ?? 'my-docs';
    filled.siteName ??= await ask('Site name', defaultName);
    if (filled.brandColor === undefined) {
      let color = await ask('Brand color (hex)', SCAFFOLD_DEFAULTS.brandColor);
      while (!HEX_COLOR.test(color)) {
        console.log(
          `  ${JSON.stringify(color)} is not a hex color like #2EA8E0`,
        );
        color = await ask('Brand color (hex)', SCAFFOLD_DEFAULTS.brandColor);
      }
      filled.brandColor = color;
    }
    if (filled.logo === undefined) {
      const logo = await ask(
        'Logo file to copy in, empty to generate one',
        'generate',
      );
      filled.logo = logo === 'generate' ? undefined : logo;
    }
    if (filled.deploy === undefined) {
      let deploy = await ask(
        `Deploy target [${DEPLOY_TARGETS.join('/')}]`,
        SCAFFOLD_DEFAULTS.deploy,
      );
      while (!DEPLOY_TARGETS.includes(deploy as never)) {
        console.log(`  pick one of: ${DEPLOY_TARGETS.join(', ')}`);
        deploy = await ask('Deploy target', SCAFFOLD_DEFAULTS.deploy);
      }
      filled.deploy = deploy as ScaffoldOptions['deploy'];
    }
    if (filled.deploy === 'github-pages') {
      filled.githubOwner ??= await ask('GitHub owner (user or org)', '');
      filled.githubRepo ??= await ask('GitHub repository', defaultName);
    }
    return filled;
  } finally {
    rl.close();
  }
}

function nextSteps(
  directory: string,
  deploy: ScaffoldOptions['deploy'],
): string {
  const lines = [
    '',
    'Your PokeDocs site is ready. Next:',
    '',
    `  cd ${directory}`,
    '  npm install',
    '  npx playwright install chromium   # once — renders diagrams at build time',
    '  npm run start',
    '',
  ];
  if (deploy === 'github-pages') {
    lines.push(
      'GitHub Pages is scaffolded in .github/workflows/deploy.yml — after the',
      'first push, set repo Settings → Pages → Source to "GitHub Actions".',
      '',
    );
  }
  return lines.join('\n');
}

export async function runCli(argv: string[]): Promise<number> {
  let parsed: ReturnType<typeof parseCliArgs>;
  try {
    parsed = parseCliArgs(argv);
  } catch (error) {
    console.error(`create-pokedocs: ${(error as Error).message}\n`);
    console.error(USAGE);
    return 1;
  }
  if (parsed.help || parsed.options === undefined) {
    console.log(USAGE);
    return parsed.help ? 0 : 1;
  }

  let options = parsed.options;
  if (!options.yes && process.stdin.isTTY && process.stdout.isTTY) {
    options = await promptForMissing(options);
  }

  try {
    const result = await scaffold(options);
    console.log(
      `\nScaffolded ${result.files.length} files into ${result.directory}`,
    );
    console.log(
      nextSteps(options.directory, options.deploy ?? SCAFFOLD_DEFAULTS.deploy),
    );
    return 0;
  } catch (error) {
    console.error(`create-pokedocs: ${(error as Error).message}`);
    return 1;
  }
}

if (require.main === module) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
