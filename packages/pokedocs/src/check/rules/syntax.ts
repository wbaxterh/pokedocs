/**
 * Syntax-hazard rules (S2.1.1): the silent breakages a green build ships
 * and the MDX3 compile errors that surface with cryptic messages. Every
 * rule here exists because a real site shipped (or failed on) it.
 */

import type { FileContext, Finding, SyntaxRule } from '../types.js';

const ADMONITION_TYPES =
  '(?:note|tip|info|warning|danger|caution|important|success|secondary)';
const ADMONITION_OPEN = new RegExp(`^:{3,}${ADMONITION_TYPES}\\b(.*)$`);
const ADMONITION_MARKER = /^(:{3,})(\S*)\s*(.*)$/;

/**
 * `:::warning Title` looks right and builds green — but Docusaurus 3 only
 * accepts `:::warning[Title]`; the bare word renders inside the box as
 * body text. The classic silent breakage.
 */
export const admonitionSpaceTitle: SyntaxRule = ({ file, lines, regions }) => {
  const findings: Finding[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (regions[i] !== 'prose') {
      continue;
    }
    const match = lines[i].match(ADMONITION_OPEN);
    if (!match) {
      continue;
    }
    const rest = match[1];
    if (rest.startsWith('[') || rest.trim() === '') {
      continue;
    }
    const title = rest.trim();
    const type = lines[i].match(new RegExp(`^:{3,}(${ADMONITION_TYPES})`))?.[1];
    findings.push({
      file,
      line: i + 1,
      rule: 'admonition-space-title',
      severity: 'error',
      message: `admonition title after a space renders as body text, not a title (builds green, ships broken)`,
      suggestion: `use :::${type}[${title}]`,
    });
  }
  return findings;
};

/** `:::` blocks that never close swallow the rest of the page. */
export const unclosedAdmonition: SyntaxRule = ({ file, lines, regions }) => {
  const stack: { line: number; colons: number }[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (regions[i] !== 'prose') {
      continue;
    }
    const match = lines[i].trim().match(ADMONITION_MARKER);
    if (!match || !lines[i].trim().startsWith(':::')) {
      continue;
    }
    const colons = match[1].length;
    const isOpen = match[2] !== '' || match[3] !== '';
    if (isOpen) {
      stack.push({ line: i + 1, colons });
    } else if (stack.length > 0) {
      stack.pop();
    }
  }
  return stack.map(({ line }) => ({
    file,
    line,
    rule: 'unclosed-admonition',
    severity: 'error' as const,
    message:
      'admonition opened here is never closed — the rest of the page renders inside the box',
    suggestion:
      'add a closing ::: (nested admonitions need more colons on the outer block, e.g. :::: outer)',
  }));
};

/**
 * `<` directly followed by a digit ("<3", "<10ms") is parsed as a JSX tag
 * open by MDX3 and fails compilation with an unhelpful error.
 */
export const ltDigit: SyntaxRule = ({ file, lines, regions }) => {
  const findings: Finding[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (regions[i] !== 'prose') {
      continue;
    }
    const stripped = stripInlineCode(lines[i]);
    const match = stripped.match(/<\d/);
    if (match) {
      findings.push({
        file,
        line: i + 1,
        rule: 'mdx-lt-digit',
        severity: 'error',
        message: `"${match[0]}" is parsed as a JSX tag by MDX and fails the build`,
        suggestion: 'escape it as &lt; or wrap the value in backticks',
      });
    }
  }
  return findings;
};

/**
 * `{#custom-id}` heading anchors fail to parse when the site runs
 * `future: { v4: true }` (mdx1Compat.headingIds is off) — the build dies
 * with "Could not parse expression with acorn". Found in the wild during
 * the TrickBook migration.
 */
export const headingCustomId: SyntaxRule = ({
  file,
  lines,
  regions,
  futureV4,
}) => {
  if (!futureV4) {
    return [];
  }
  const findings: Finding[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (regions[i] !== 'prose' || !/^#{1,6}\s/.test(lines[i])) {
      continue;
    }
    const match = lines[i].match(/\{#([\w-]+)\}\s*$/);
    if (match) {
      findings.push({
        file,
        line: i + 1,
        rule: 'heading-custom-id-v4',
        severity: 'error',
        message: `{#${match[1]}} heading anchors break under future.v4 ("Could not parse expression with acorn")`,
        suggestion:
          'remove the {#id} and update inbound links to the auto-generated slug (or disable future.v4)',
      });
    }
  }
  return findings;
};

/**
 * Mermaid edge/node labels containing parentheses must be quoted, or the
 * diagram fails to parse — at build time with PokeDocs, at render time
 * (a permanently-spinning diagram) with stock Docusaurus.
 */
export const mermaidUnquotedParens: SyntaxRule = ({ file, lines, regions }) => {
  const findings: Finding[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (regions[i] !== 'mermaid') {
      continue;
    }
    // Node text: A[label (with parens)] — quoted form is A["label (with parens)"].
    // The first char after [ must not be ( — that's the valid cylinder
    // shape A[(Database)], not an unquoted label.
    const node = lines[i].match(/\[([^(\]"][^\]"]*\([^\]"]*)\]/);
    // Edge label: -- label (x) --> or |label (x)|
    const edge = lines[i].match(/\|([^|"]*\([^|"]*)\|/);
    const hit = node ?? edge;
    if (hit) {
      findings.push({
        file,
        line: i + 1,
        rule: 'mermaid-unquoted-parens',
        severity: 'warning',
        message: `unquoted parentheses in a mermaid label usually fail the diagram parse`,
        suggestion: `quote the label: ${node ? `["${hit[1]}"]` : `|"${hit[1]}"|`}`,
      });
    }
  }
  return findings;
};

function stripInlineCode(line: string): string {
  return line.replace(/`[^`]*`/g, '');
}

export const SYNTAX_RULES: SyntaxRule[] = [
  admonitionSpaceTitle,
  unclosedAdmonition,
  ltDigit,
  headingCustomId,
  mermaidUnquotedParens,
];

export function runSyntaxRules(context: FileContext): Finding[] {
  return SYNTAX_RULES.flatMap((rule) => rule(context));
}
