/**
 * `pokedocs deploy init <target>` — resolves the site context, asks the
 * target for its files, and writes them without clobbering anything
 * unless --force.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { dockerTarget } from './docker.js';
import { githubPagesTarget } from './github-pages.js';
import type { DeployInitContext, DeployTarget } from './targets.js';
import { findSiteConfig, normalizeBaseUrl, parseBaseUrl } from './targets.js';

export const DEPLOY_TARGETS: DeployTarget[] = [githubPagesTarget, dockerTarget];

export class DeployInitError extends Error {}

export interface DeployInitFlags {
  baseUrl?: string;
  domain?: string;
  force?: boolean;
}

export interface DeployInitResult {
  target: string;
  written: string[];
  nextSteps: string;
}

export function targetList(): string {
  return DEPLOY_TARGETS.map(
    (t) => `  ${t.name.padEnd(14)}${t.description}`,
  ).join('\n');
}

export async function runDeployInit(
  targetName: string,
  siteDir: string,
  flags: DeployInitFlags = {},
): Promise<DeployInitResult> {
  const target = DEPLOY_TARGETS.find((t) => t.name === targetName);
  if (!target) {
    throw new DeployInitError(
      `unknown deploy target ${JSON.stringify(targetName)}. Available targets:\n${targetList()}`,
    );
  }

  const configFile = await findSiteConfig(siteDir);
  if (!configFile) {
    throw new DeployInitError(
      `no docusaurus.config.ts/js found in ${siteDir} — run this from your site directory.`,
    );
  }

  let baseUrl = flags.baseUrl;
  if (baseUrl === undefined) {
    baseUrl = parseBaseUrl(await readFile(configFile, 'utf8')) ?? '/';
  }
  const context: DeployInitContext = {
    siteDir,
    baseUrl: normalizeBaseUrl(baseUrl),
    domain: flags.domain,
  };

  const files = target.files(context);

  if (!flags.force) {
    for (const file of files) {
      const existing = await readFile(
        path.join(siteDir, file.path),
        'utf8',
      ).catch(() => null);
      if (existing !== null && existing !== file.content) {
        throw new DeployInitError(
          `${file.path} already exists — re-run with --force to overwrite.`,
        );
      }
    }
  }

  const written: string[] = [];
  for (const file of files) {
    const absolute = path.join(siteDir, file.path);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, file.content);
    written.push(file.path);
  }

  return { target: target.name, written, nextSteps: target.nextSteps(context) };
}
