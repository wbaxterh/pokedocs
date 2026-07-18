/**
 * Source-preservation pre-pass (S1.3.2, ADR-0001).
 *
 * Before the engine replaces each mermaid fence with SVG, wrap the fence in
 * `<div class="pokedocs-mermaid" data-mermaid-source="…">`. The engine
 * replaces the inner <pre> in place and leaves the wrapper — so every built
 * page carries BOTH the rendered SVG and the verbatim mermaid source.
 *
 * Hand-rolled hast walk: the unist utilities are ESM-only, and this tiny
 * traversal isn't worth the interop cost in a CJS package.
 */

export interface HastNode {
  type: string;
  value?: string;
  children?: HastNode[];
}

export interface HastElement extends HastNode {
  tagName?: string;
  properties?: Record<string, unknown>;
}

function textContent(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textContent).join('');
}

function isMermaidPre(node: HastElement): boolean {
  if (node.tagName !== 'pre') return false;
  return (node.children ?? []).some((child) => {
    const el = child as HastElement;
    const cls = el.properties?.className;
    return (
      el.tagName === 'code' &&
      Array.isArray(cls) &&
      cls.some((c) => c === 'language-mermaid' || c === 'mermaid')
    );
  });
}

/**
 * Wrap every mermaid fence in the tree; returns how many were wrapped.
 * Mutates the tree in place (children arrays are replaced element-wise).
 */
export function wrapMermaidFences(tree: HastElement): number {
  let wrapped = 0;
  const walk = (node: HastElement): void => {
    const children = node.children as HastElement[] | undefined;
    if (!children) return;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child && isMermaidPre(child)) {
        const source = textContent(child).trimEnd();
        children[i] = {
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['pokedocs-mermaid'],
            dataMermaidSource: source,
          },
          children: [child],
        };
        wrapped++;
      } else if (child) {
        walk(child);
      }
    }
  };
  walk(tree);
  return wrapped;
}
