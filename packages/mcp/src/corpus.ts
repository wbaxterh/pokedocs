/**
 * The docs corpus behind `pokedocs mcp` (S3.3.2): ranked search and a
 * read-only, shell-like query over a virtual tree of the site's .md twins.
 * Pure and runtime-agnostic: it holds the pages in memory and never
 * touches a real filesystem, so the edge Worker (S3.3.3) reuses it as is
 * and a query cannot reach anything outside the tree by construction.
 */

export interface CorpusPage {
  /** Virtual path, e.g. "/architecture.md". */
  path: string;
  title: string;
  description: string;
  /** Canonical page URL, when the build's pages.json supplies one. */
  url?: string;
  markdown: string;
}

export interface SearchHit {
  title: string;
  path: string;
  url?: string;
  snippet: string;
  score: number;
}

/** Output caps keep one tool call from flooding an agent's context. */
export const MAX_OUTPUT_CHARS = 64_000;
export const MAX_GREP_LINES = 200;

const STOPWORDS = new Set(
  'a an and are as at be by for from how i in is it of on or the to what when where which who why with'.split(
    ' ',
  ),
);

function tokens(text: string): string[] {
  return (
    text.toLowerCase().match(/[a-z0-9][a-z0-9_.-]*[a-z0-9]|[a-z0-9]/g) ?? []
  ).filter((token) => !STOPWORDS.has(token));
}

/** Twins open with the S3.2.3 index pointer; it says nothing about the page. */
function bodyOf(markdown: string): string {
  return markdown.replace(/^(>.*\n)+\n?/, '');
}

interface IndexedPage {
  page: CorpusPage;
  fields: { weight: number; counts: Map<string, number>; length: number }[];
}

function countTokens(text: string) {
  const counts = new Map<string, number>();
  const list = tokens(text);
  for (const token of list) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return { counts, length: list.length };
}

export class DocsCorpus {
  readonly pages: ReadonlyMap<string, CorpusPage>;
  private readonly index: IndexedPage[];
  private readonly documentFrequency = new Map<string, number>();
  private readonly averageLength: number[];

  constructor(pages: CorpusPage[]) {
    this.pages = new Map(
      [...pages]
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((page) => [page.path, page]),
    );
    this.index = [...this.pages.values()].map((page) => {
      const headings = bodyOf(page.markdown)
        .split('\n')
        .filter((line) => /^#{1,6}\s/.test(line))
        .join(' ');
      return {
        page,
        fields: [
          { weight: 3, ...countTokens(page.title) },
          { weight: 2, ...countTokens(page.description) },
          { weight: 1.5, ...countTokens(headings) },
          { weight: 1, ...countTokens(bodyOf(page.markdown)) },
        ],
      };
    });
    for (const entry of this.index) {
      const seen = new Set(entry.fields.flatMap((f) => [...f.counts.keys()]));
      for (const token of seen) {
        this.documentFrequency.set(
          token,
          (this.documentFrequency.get(token) ?? 0) + 1,
        );
      }
    }
    this.averageLength = [0, 1, 2, 3].map(
      (i) =>
        this.index.reduce((sum, e) => sum + e.fields[i].length, 0) /
          Math.max(1, this.index.length) || 1,
    );
  }

  /** BM25 across title, description, headings, and body, title weighted most. */
  search(query: string, limit = 8): SearchHit[] {
    const terms = [...new Set(tokens(query))];
    if (terms.length === 0) {
      return [];
    }
    const total = this.index.length;
    const k1 = 1.2;
    const b = 0.75;
    const scored = this.index.map((entry) => {
      let score = 0;
      for (const term of terms) {
        const df = this.documentFrequency.get(term) ?? 0;
        if (df === 0) {
          continue;
        }
        const idf = Math.log(1 + (total - df + 0.5) / (df + 0.5));
        entry.fields.forEach((field, i) => {
          const tf = field.counts.get(term) ?? 0;
          if (tf === 0) {
            return;
          }
          const norm = 1 - b + (b * field.length) / this.averageLength[i];
          score += field.weight * idf * ((tf * (k1 + 1)) / (tf + k1 * norm));
        });
      }
      return { entry, score };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort(
        (x, y) =>
          y.score - x.score ||
          x.entry.page.path.localeCompare(y.entry.page.path),
      )
      .slice(0, Math.max(1, Math.min(limit, 25)))
      .map(({ entry, score }) => ({
        title: entry.page.title,
        path: entry.page.path,
        ...(entry.page.url ? { url: entry.page.url } : {}),
        snippet: snippet(entry.page, terms),
        score: Math.round(score * 100) / 100,
      }));
  }

  /**
   * One read-only command over the virtual tree: `ls`, `cat`, `head`, or
   * `grep`. Errors come back as text with `isError`, never as exceptions,
   * so the agent can read them and correct the command.
   */
  query(command: string): { text: string; isError: boolean } {
    let argv: string[];
    try {
      argv = splitCommand(command);
    } catch (error) {
      return failure((error as Error).message);
    }
    if (argv.length === 0) {
      return failure('empty command. Try: ls /');
    }
    const [name, ...args] = argv;
    switch (name) {
      case 'ls':
        return this.ls(args);
      case 'cat':
        return this.cat(args);
      case 'head':
        return this.head(args);
      case 'grep':
        return this.grep(args);
      default:
        return failure(
          `unsupported command "${name}". Available: ls [dir], cat <file>..., head [-n N] <file>, grep [-i] [-l] <pattern> [path]...`,
        );
    }
  }

  private ls(args: string[]) {
    const dir = normalizeDir(args[0] ?? '/');
    const entries = new Set<string>();
    for (const path of this.pages.keys()) {
      if (!path.startsWith(dir)) {
        continue;
      }
      const rest = path.slice(dir.length);
      const slash = rest.indexOf('/');
      entries.add(slash === -1 ? rest : `${rest.slice(0, slash)}/`);
    }
    if (entries.size === 0) {
      return failure(`ls: ${dir}: no such directory`);
    }
    return ok([...entries].sort().join('\n'));
  }

  private cat(args: string[]) {
    if (args.length === 0) {
      return failure('cat: missing file. Example: cat /architecture.md');
    }
    const parts: string[] = [];
    for (const arg of args) {
      const page = this.pages.get(normalizeFile(arg));
      if (!page) {
        return failure(`cat: ${arg}: no such file`);
      }
      parts.push(page.markdown);
    }
    return ok(parts.join('\n'));
  }

  private head(args: string[]) {
    let lines = 10;
    const files: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '-n') {
        lines = Number(args[++i]);
      } else if (/^-n\d+$/.test(arg)) {
        lines = Number(arg.slice(2));
      } else if (/^-\d+$/.test(arg)) {
        lines = Number(arg.slice(1));
      } else {
        files.push(arg);
      }
    }
    if (!Number.isInteger(lines) || lines < 1) {
      return failure('head: -n needs a positive whole number');
    }
    if (files.length !== 1) {
      return failure(
        'head: give exactly one file. Example: head -n 40 /architecture.md',
      );
    }
    const page = this.pages.get(normalizeFile(files[0]));
    if (!page) {
      return failure(`head: ${files[0]}: no such file`);
    }
    return ok(page.markdown.split('\n').slice(0, lines).join('\n'));
  }

  private grep(args: string[]) {
    let ignoreCase = false;
    let filesOnly = false;
    const rest: string[] = [];
    for (const arg of args) {
      if (/^-[a-zA-Z]+$/.test(arg) && rest.length === 0) {
        for (const flag of arg.slice(1)) {
          if (flag === 'i') ignoreCase = true;
          else if (flag === 'l') filesOnly = true;
          else if (flag === 'r' || flag === 'n' || flag === 'E') {
            // Recursive, line numbers, and extended regex are always on.
          } else {
            return failure(
              `grep: unsupported flag -${flag}. Supported: -i, -l`,
            );
          }
        }
      } else {
        rest.push(arg);
      }
    }
    const [pattern, ...scopes] = rest;
    if (pattern === undefined) {
      return failure('grep: missing pattern. Example: grep -i "base url" /');
    }
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, ignoreCase ? 'i' : '');
    } catch {
      regex = new RegExp(
        pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        ignoreCase ? 'i' : '',
      );
    }
    const targets = this.resolveScopes(scopes.length ? scopes : ['/']);
    if (typeof targets === 'string') {
      return failure(targets);
    }
    const out: string[] = [];
    let truncated = false;
    for (const page of targets) {
      const lines = page.markdown.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!regex.test(lines[i])) {
          continue;
        }
        if (filesOnly) {
          out.push(page.path);
          break;
        }
        if (out.length >= MAX_GREP_LINES) {
          truncated = true;
          break;
        }
        out.push(`${page.path}:${i + 1}:${lines[i]}`);
      }
      if (truncated) {
        break;
      }
    }
    if (out.length === 0) {
      return ok('(no matches)');
    }
    return ok(
      truncated
        ? `${out.join('\n')}\n[stopped at ${MAX_GREP_LINES} matching lines; narrow the pattern or the path]`
        : out.join('\n'),
    );
  }

  private resolveScopes(scopes: string[]): CorpusPage[] | string {
    const pages: CorpusPage[] = [];
    for (const scope of scopes) {
      const file = this.pages.get(normalizeFile(scope));
      if (file) {
        pages.push(file);
        continue;
      }
      const dir = normalizeDir(scope);
      const inDir = [...this.pages.values()].filter((p) =>
        p.path.startsWith(dir),
      );
      if (inDir.length === 0) {
        return `grep: ${scope}: no such file or directory`;
      }
      pages.push(...inDir);
    }
    return [...new Set(pages)];
  }
}

function ok(text: string) {
  return {
    text:
      text.length > MAX_OUTPUT_CHARS
        ? `${text.slice(0, MAX_OUTPUT_CHARS)}\n[truncated at ${MAX_OUTPUT_CHARS} characters; use head -n or grep to read less]`
        : text,
    isError: false,
  };
}

function failure(text: string) {
  return { text, isError: true };
}

/** Resolve "." and ".." lexically; the tree has no outside to escape to. */
function normalize(input: string): string {
  const parts: string[] = [];
  for (const part of input.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return `/${parts.join('/')}`;
}

function normalizeFile(input: string): string {
  const path = normalize(input);
  return path.endsWith('.md') || path.endsWith('.mdx')
    ? path.replace(/\.mdx$/, '.md')
    : `${path}.md`;
}

function normalizeDir(input: string): string {
  const path = normalize(input);
  return path === '/' ? '/' : `${path}/`;
}

/** Whitespace split with single and double quotes; no pipes or globs. */
export function splitCommand(command: string): string[] {
  const out: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let started = false;
  for (const char of command.trim()) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) {
        out.push(current);
        current = '';
        started = false;
      }
    } else if (char === '|' || char === ';' || char === '&' || char === '>') {
      throw new Error(
        `"${char}" is not supported: run one command per call (ls, cat, head, grep)`,
      );
    } else {
      current += char;
      started = true;
    }
  }
  if (quote) {
    throw new Error('unclosed quote in command');
  }
  if (started) {
    out.push(current);
  }
  return out;
}

/** The lines around the first strong match, collapsed to one line. */
function snippet(page: CorpusPage, terms: string[]): string {
  const lines = bodyOf(page.markdown)
    .split('\n')
    .filter((line) => line.trim() !== '' && !line.startsWith('```'));
  let best = 0;
  let bestScore = -1;
  lines.forEach((line, i) => {
    const lineTokens = new Set(tokens(line));
    const score = terms.filter((t) => lineTokens.has(t)).length;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  const text = lines
    .slice(best, best + 2)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 240 ? `${text.slice(0, 237)}...` : text;
}
