/**
 * @pokedocs/actions — shipped CI templates (PRD F4.1, F4.2, S1.7.1).
 *
 * Workflow templates scaffolded into sites by `pokedocs deploy init` and the
 * drift-CI setup: PR-triggered AI doc updater, scheduled docs maintainer,
 * deterministic code-coupling checks, and deploy pipelines. Deterministic
 * gates always run before any LLM does; AI output lands as reviewable PRs.
 */

import path from 'node:path';

export const TEMPLATE_NAMES = [
  'deploy-github-pages',
  'drift-check',
  'drift-update',
  'scheduled-maintainer',
] as const;
export type TemplateName = (typeof TEMPLATE_NAMES)[number];

/** Absolute path to the bundled workflow templates directory. */
export function templatesDir(): string {
  return path.join(__dirname, '..', 'templates');
}
