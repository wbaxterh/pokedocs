/**
 * `pokedocs check` runner (F2.1): scans the docs tree with the syntax
 * rules and structural checks, in seconds, without a production build.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { classifyLines } from './regions.js';
import { runSyntaxRules } from './rules/syntax.js';
import {
  collectSidebarIds,
  type DocInfo,
  docIdFor,
  loadSidebars,
  readFrontmatterScalars,
  structuralFindings,
} from './structure.js';
import type { CheckSummary, Finding } from './types.js';

export interface CheckOptions {
  /** Docs directory relative to the site dir. Default "docs". */
  docsDir?: string;
  /** Skip structural (sidebar) checks. */
  noStructure?: boolean;
}

async function markdownFiles(root: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await markdownFiles(path.join(root, entry.name), rel)));
    } else if (/\.mdx?$/.test(entry.name)) {
      files.push(rel);
    }
  }
  return files.sort();
}

async function siteHasFutureV4(siteDir: string): Promise<boolean> {
  for (const name of [
    'docusaurus.config.ts',
    'docusaurus.config.js',
    'docusaurus.config.mjs',
  ]) {
    const source = await readFile(path.join(siteDir, name), 'utf8').catch(
      () => null,
    );
    if (source !== null) {
      return /v4:\s*true/.test(source);
    }
  }
  return false;
}

export async function runCheck(
  siteDir: string,
  options: CheckOptions = {},
): Promise<CheckSummary> {
  const docsDir = options.docsDir ?? 'docs';
  const docsRoot = path.join(siteDir, docsDir);
  const futureV4 = await siteHasFutureV4(siteDir);
  const files = await markdownFiles(docsRoot);

  const findings: Finding[] = [];
  const docs: DocInfo[] = [];

  for (const rel of files) {
    const file = `${docsDir}/${rel}`;
    const content = await readFile(path.join(docsRoot, rel), 'utf8');
    const lines = content.split('\n');
    const { regions, findings: regionFindings } = classifyLines(file, lines);
    findings.push(...regionFindings);
    findings.push(...runSyntaxRules({ file, lines, regions, futureV4 }));

    const frontmatter = readFrontmatterScalars(lines);
    docs.push({
      file,
      id: docIdFor(rel, frontmatter.id || undefined),
      draft: frontmatter.draft === 'true',
      unlisted: frontmatter.unlisted === 'true',
    });
  }

  if (!options.noStructure) {
    const sidebars = await loadSidebars(siteDir);
    if (sidebars !== null) {
      findings.push(
        ...structuralFindings(docs, collectSidebarIds(sidebars), 'sidebars.ts'),
      );
    }
  }

  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return {
    findings,
    filesChecked: files.length,
    errors: findings.filter((f) => f.severity === 'error').length,
    warnings: findings.filter((f) => f.severity === 'warning').length,
  };
}

export { classifyLines } from './regions.js';
export { SYNTAX_RULES } from './rules/syntax.js';
export type { CheckSummary, Finding, Severity } from './types.js';
