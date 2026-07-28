#!/usr/bin/env node
/**
 * pokedocs CLI entry point. `deploy init` is live (F1.7); the other
 * commands arrive with their milestones (see src/index.ts).
 */

import path from 'node:path';
import { parseArgs } from 'node:util';
import { type CheckFormat, formatSummary } from './check/format.js';
import { runCheck } from './check/index.js';
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

const CHECK_USAGE = `Usage: pokedocs check [site-dir] [options]

The docs linter for what a green build won't catch: broken admonition
titles, unclosed fences and admonitions, MDX3 compile hazards, mermaid
label pitfalls, orphaned pages, and dangling sidebar entries — in
seconds, without a production build.

Options:
  --docs-dir <dir>       Docs directory relative to the site (default: docs)
  --format <fmt>         text | json | github (default: text)
  --fail-on <severity>   error | warning | never (default: error)
  --no-structure         Skip sidebar/orphan checks
  -h, --help             Show this help
`;

async function runCheckCommand(rest: string[]): Promise<number> {
  let values: {
    'docs-dir'?: string;
    format?: string;
    'fail-on'?: string;
    'no-structure'?: boolean;
    help?: boolean;
  };
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        'docs-dir': { type: 'string' },
        format: { type: 'string', default: 'text' },
        'fail-on': { type: 'string', default: 'error' },
        'no-structure': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    }));
  } catch (error) {
    console.error(`pokedocs: ${(error as Error).message}\n\n${CHECK_USAGE}`);
    return 1;
  }
  if (values.help) {
    console.log(CHECK_USAGE);
    return 0;
  }
  const format = values.format as CheckFormat;
  if (!['text', 'json', 'github'].includes(format)) {
    console.error(
      `pokedocs: unknown --format ${JSON.stringify(values.format)} — expected text, json, or github`,
    );
    return 1;
  }
  const failOn = values['fail-on'];
  if (!['error', 'warning', 'never'].includes(failOn ?? '')) {
    console.error(
      `pokedocs: unknown --fail-on ${JSON.stringify(failOn)} — expected error, warning, or never`,
    );
    return 1;
  }

  const summary = await runCheck(path.resolve(positionals[0] ?? '.'), {
    docsDir: values['docs-dir'],
    noStructure: values['no-structure'],
  });
  console.log(formatSummary(summary, format));

  if (failOn === 'never') {
    return 0;
  }
  const failing =
    failOn === 'warning' ? summary.errors + summary.warnings : summary.errors;
  return failing > 0 ? 1 : 0;
}

export async function runCli(argv: string[]): Promise<number> {
  const [command, subcommand, ...rest] = argv;

  if (command === 'check') {
    return runCheckCommand(argv.slice(1));
  }

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
    `pokedocs — agent-native docs tooling.\n\nCommands:\n  check [site-dir]       lint docs for what a green build won't catch\n  deploy init <target>   scaffold deploy artifacts\n  export, mcp            coming with their milestones\n\n${DEPLOY_USAGE}\n${CHECK_USAGE}`,
  );
  return 1;
}

if (require.main === module) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
