/**
 * @pokedocs/plugin-mermaid-ssr — build-time mermaid rendering (PRD F1.3).
 *
 * Every mermaid code fence compiles to inline SVG during the build (S1.3.1),
 * the verbatim source is preserved in a data attribute for AI agents
 * (S1.3.2), and a syntax error fails the build with file and line (S1.3.3).
 *
 * Engine per ADR-0001: rehype-mermaid `inline-svg`. This package is the CJS
 * wrapper that ADR requires — it defers the ESM-only import to transform
 * time (the Docusaurus config loader cannot import ESM), and shares ONE
 * inner transformer across all files (a per-file transformer launches a
 * browser per file and costs 12x).
 */

import {
  type HastElement,
  type HastNode,
  wrapMermaidFences,
} from './preserve-source.js';

export interface MermaidSsrOptions {
  /**
   * Keep the raw mermaid source on the wrapper element as
   * `data-mermaid-source` (S1.3.2). Defaults to true — this is the
   * agent-readability contract; turning it off violates the PRD's
   * "mermaid sources are never discarded" rule.
   */
  preserveSource?: boolean;
  /** Mermaid theme variables forwarded to mermaid.initialize. */
  themeVariables?: Record<string, string>;
  /** Full mermaid config passthrough (merged over themeVariables). */
  mermaidConfig?: Record<string, unknown>;
}

/**
 * Engine decision (ADR-0001, S1.3.4): rehype-mermaid `inline-svg`, wrapped in
 * this CJS package with a deferred ESM import, ONE shared transformer across
 * all files (per-file transformers cost 12x), and a source-preservation
 * pre-pass. mermaid-cli was rejected: slower, a second CI browser, and no
 * file/line error story.
 */
export const MERMAID_SSR_ENGINE = 'rehype-mermaid';

/** CSS class on the wrapper that carries the preserved source. */
export const WRAPPER_CLASS = 'pokedocs-mermaid';

type Transformer = (tree: HastNode, file: VFileLike) => Promise<unknown>;

interface VFileLike {
  path?: string;
  fail(reason: string, place?: unknown, origin?: string): never;
}

interface VFileMessageLike extends Error {
  reason?: string;
  place?: unknown;
}

// ONE inner transformer per options-shape for the whole build process —
// mermaid-isomorphic batches diagrams and reuses its in-flight browser only
// when the transformer instance is shared (ADR-0001 finding: 12x otherwise).
const transformerCache = new Map<string, Promise<Transformer>>();

async function getInnerTransformer(
  options: MermaidSsrOptions,
): Promise<Transformer> {
  const key = JSON.stringify([options.themeVariables, options.mermaidConfig]);
  let cached = transformerCache.get(key);
  if (!cached) {
    cached = (async () => {
      // Dynamic import (preserved as real import() under NodeNext): the
      // ESM-only engine loads at transform time, never at config time.
      const { default: rehypeMermaid } = await import('rehype-mermaid');
      const attacher = rehypeMermaid as unknown as (o: unknown) => Transformer;
      return attacher({
        strategy: 'inline-svg',
        mermaidConfig: {
          ...(options.themeVariables
            ? { themeVariables: options.themeVariables }
            : {}),
          ...options.mermaidConfig,
        },
      });
    })();
    transformerCache.set(key, cached);
  }
  return cached;
}

/** Strip rehype-mermaid's serialized hast dump from an error, keep the parse message. */
function cleanErrorReason(err: VFileMessageLike): string {
  const raw = err.reason ?? err.message ?? String(err);
  const dumpStart = raw.search(/\n\s*[[{]"/);
  const message = dumpStart > 0 ? raw.slice(0, dumpStart) : raw;
  return `Invalid mermaid diagram: ${message.trim()}`;
}

/**
 * The rehype plugin. Wire it into the Docusaurus docs pipeline via
 * `beforeDefaultRehypePlugins` (the preset does this automatically once
 * S1.2.1 lands). `markdown.mermaid` and `@docusaurus/theme-mermaid` must be
 * OFF — otherwise fences become React components before rehype sees them.
 */
export function rehypeMermaidSsr(options: MermaidSsrOptions = {}) {
  const preserve = options.preserveSource !== false;
  return async (tree: HastNode, file: VFileLike): Promise<void> => {
    const wrapped = preserve ? wrapMermaidFences(tree as HastElement) : 0;
    const transformer = await getInnerTransformer(options);
    try {
      await transformer(tree, file);
    } catch (err) {
      const e = err as VFileMessageLike;
      file.fail(cleanErrorReason(e), e.place, 'pokedocs:mermaid-ssr');
    }
    void wrapped;
  };
}

export default rehypeMermaidSsr;
export { wrapMermaidFences } from './preserve-source.js';
