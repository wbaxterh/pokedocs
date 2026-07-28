/**
 * Line classification: every syntax rule depends on knowing whether a
 * line is prose, inside a code fence, inside a mermaid fence, or
 * frontmatter — that's what keeps `<3` in a code sample from being a
 * finding. Also reports unclosed fences, since the classifier is the
 * one part that knows.
 */

import type { Finding, LineRegion } from './types.js';

const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/;

export interface RegionScan {
  regions: LineRegion[];
  findings: Finding[];
}

export function classifyLines(file: string, lines: string[]): RegionScan {
  const regions: LineRegion[] = new Array(lines.length).fill('prose');
  const findings: Finding[] = [];

  let index = 0;
  // Leading frontmatter block.
  if (lines[0]?.trim() === '---') {
    regions[0] = 'frontmatter';
    index = 1;
    while (index < lines.length && lines[index].trim() !== '---') {
      regions[index] = 'frontmatter';
      index += 1;
    }
    if (index < lines.length) {
      regions[index] = 'frontmatter';
      index += 1;
    }
  }

  let openFence: { marker: string; line: number; mermaid: boolean } | null =
    null;
  for (; index < lines.length; index += 1) {
    const match = lines[index].match(FENCE);
    if (openFence === null) {
      if (match) {
        openFence = {
          marker: match[2][0].repeat(match[2].length),
          line: index + 1,
          mermaid: /^\s*mermaid\b/.test(match[3]),
        };
        regions[index] = openFence.mermaid ? 'mermaid' : 'fence';
      }
      continue;
    }
    regions[index] = openFence.mermaid ? 'mermaid' : 'fence';
    // A closing fence: same char, at least as long, no info string.
    if (
      match &&
      match[2][0] === openFence.marker[0] &&
      match[2].length >= openFence.marker.length &&
      match[3].trim() === ''
    ) {
      openFence = null;
    }
  }

  if (openFence !== null) {
    findings.push({
      file,
      line: openFence.line,
      rule: 'unclosed-fence',
      severity: 'error',
      message: `code fence opened here is never closed — everything after it renders as code`,
      suggestion:
        'add the closing fence, or check for a shorter closing marker than the opener',
    });
  }

  return { regions, findings };
}
