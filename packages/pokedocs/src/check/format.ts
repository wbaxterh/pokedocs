/**
 * Output formats (S2.1.3): text for humans, json for machines, github
 * for inline PR annotations.
 */

import type { CheckSummary } from './types.js';

export type CheckFormat = 'text' | 'json' | 'github';

export function formatText(summary: CheckSummary): string {
  if (summary.findings.length === 0) {
    return `pokedocs check: ${summary.filesChecked} files, no findings`;
  }
  const lines: string[] = [];
  let lastFile = '';
  for (const finding of summary.findings) {
    if (finding.file !== lastFile) {
      lines.push('', finding.file);
      lastFile = finding.file;
    }
    const location = finding.line > 0 ? `:${finding.line}` : '';
    lines.push(
      `  ${finding.severity.toUpperCase().padEnd(7)} ${finding.rule}${location} — ${finding.message}`,
    );
    if (finding.suggestion) {
      lines.push(`          fix: ${finding.suggestion}`);
    }
  }
  lines.push(
    '',
    `${summary.errors} errors, ${summary.warnings} warnings in ${summary.filesChecked} files`,
  );
  return lines.join('\n').trimStart();
}

export function formatJson(summary: CheckSummary): string {
  return `${JSON.stringify(summary, null, 2)}\n`;
}

/** GitHub Actions workflow commands — annotations appear inline on PRs. */
export function formatGithub(summary: CheckSummary): string {
  return summary.findings
    .map((f) => {
      const line = f.line > 0 ? `,line=${f.line}` : '';
      const fix = f.suggestion ? ` Fix: ${f.suggestion}` : '';
      return `::${f.severity} file=${f.file}${line},title=${f.rule}::${f.message}.${fix}`;
    })
    .join('\n');
}

export function formatSummary(
  summary: CheckSummary,
  format: CheckFormat,
): string {
  switch (format) {
    case 'json':
      return formatJson(summary);
    case 'github':
      return formatGithub(summary);
    default:
      return formatText(summary);
  }
}
