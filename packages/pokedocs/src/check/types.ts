/**
 * `pokedocs check` core types (F2.1): findings are the single currency —
 * every rule produces them, every output format consumes them.
 */

export type Severity = 'error' | 'warning';

export interface Finding {
  /** Path relative to the checked directory's parent (site dir). */
  file: string;
  /** 1-based. 0 means "whole file". */
  line: number;
  rule: string;
  severity: Severity;
  message: string;
  /** Concrete fix, shown to humans and agents alike. */
  suggestion?: string;
}

/** A syntax rule scans one file's lines and reports findings. */
export interface FileContext {
  /** Relative file path (for findings). */
  file: string;
  lines: string[];
  /**
   * Per-line region classification, aligned with `lines`:
   * 'prose' | 'fence' (inside a code fence) | 'mermaid' (inside a mermaid
   * fence) | 'frontmatter'.
   */
  regions: LineRegion[];
  /** True when the site config enables future: { v4: true }. */
  futureV4: boolean;
}

export type LineRegion = 'prose' | 'fence' | 'mermaid' | 'frontmatter';

export type SyntaxRule = (context: FileContext) => Finding[];

export interface CheckSummary {
  findings: Finding[];
  filesChecked: number;
  errors: number;
  warnings: number;
}
