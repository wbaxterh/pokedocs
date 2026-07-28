#!/usr/bin/env node
/**
 * pokedocs CLI entry point. `deploy init` is live (F1.7); the other
 * commands arrive with their milestones (see src/index.ts).
 */

import { parseArgs } from 'node:util';
import { DeployInitError, runDeployInit, targetList } from './deploy/init.js';
import { COMMANDS } from './index.js';

const DEPLOY_USAGE = `Usage: pokedocs deploy init <target> [options]

Targets:
${targetList()}

Options:
  --base-url <path>  Base path override (default: read from docusaurus.config)
  --domain <host>    Custom domain (github-pages: writes static/CNAME)
  --force            Overwrite existing files
  -h, --help         Show this help
`;

async function runDeploy(rest: string[]): Promise<number> {
  let values: {
    'base-url'?: string;
    domain?: string;
    force?: boolean;
    help?: boolean;
  };
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        'base-url': { type: 'string' },
        domain: { type: 'string' },
        force: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    }));
  } catch (error) {
    console.error(`pokedocs: ${(error as Error).message}\n\n${DEPLOY_USAGE}`);
    return 1;
  }
  if (values.help || positionals.length === 0) {
    console.log(DEPLOY_USAGE);
    return values.help ? 0 : 1;
  }
  try {
    const result = await runDeployInit(positionals[0], process.cwd(), {
      baseUrl: values['base-url'],
      domain: values.domain,
      force: values.force,
    });
    console.log(
      `pokedocs deploy init ${result.target}: wrote ${result.written.join(', ')}\n\n${result.nextSteps}`,
    );
    return 0;
  } catch (error) {
    if (error instanceof DeployInitError) {
      console.error(`pokedocs: ${error.message}`);
      return 1;
    }
    throw error;
  }
}

export async function runCli(argv: string[]): Promise<number> {
  const [command, subcommand, ...rest] = argv;

  if (command === 'deploy') {
    if (subcommand !== 'init') {
      console.error(DEPLOY_USAGE);
      return 1;
    }
    return runDeploy(rest);
  }

  if (command && (COMMANDS as readonly string[]).includes(command)) {
    console.error(
      `pokedocs ${command} is not implemented yet — follow along at github.com/wbaxterh/pokedocs`,
    );
    return 1;
  }

  console.error(
    `pokedocs — agent-native docs tooling.\n\nCommands:\n  deploy init <target>   scaffold deploy artifacts\n  check, export, mcp     coming with their milestones\n\n${DEPLOY_USAGE}`,
  );
  return 1;
}

if (require.main === module) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
