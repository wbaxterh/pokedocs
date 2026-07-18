import { describe, expect, it } from 'vitest';
import type { HastElement } from './preserve-source.js';
import { wrapMermaidFences } from './preserve-source.js';

const mermaidFence = (source: string): HastElement => ({
  type: 'element',
  tagName: 'pre',
  children: [
    {
      type: 'element',
      tagName: 'code',
      properties: { className: ['language-mermaid'] },
      children: [{ type: 'text', value: source }],
    } as HastElement,
  ],
});

const tree = (...children: HastElement[]): HastElement => ({
  type: 'root',
  children,
});

describe('wrapMermaidFences', () => {
  it('wraps a mermaid fence and preserves verbatim source', () => {
    const source = 'graph TD\n  A[Start] --> B{Choice}\n  B -->|yes| C';
    const root = tree(mermaidFence(source));
    expect(wrapMermaidFences(root)).toBe(1);

    const wrapper = root.children?.[0] as HastElement;
    expect(wrapper.tagName).toBe('div');
    expect(wrapper.properties?.className).toEqual(['pokedocs-mermaid']);
    expect(wrapper.properties?.dataMermaidSource).toBe(source);
    expect((wrapper.children?.[0] as HastElement).tagName).toBe('pre');
  });

  it('leaves non-mermaid code fences untouched', () => {
    const root = tree({
      type: 'element',
      tagName: 'pre',
      children: [
        {
          type: 'element',
          tagName: 'code',
          properties: { className: ['language-ts'] },
          children: [{ type: 'text', value: 'const x = 1;' }],
        } as HastElement,
      ],
    });
    expect(wrapMermaidFences(root)).toBe(0);
    expect((root.children?.[0] as HastElement).tagName).toBe('pre');
  });

  it('finds fences nested deeper in the tree', () => {
    const root = tree({
      type: 'element',
      tagName: 'section',
      children: [
        {
          type: 'element',
          tagName: 'div',
          children: [mermaidFence('sequenceDiagram\n  A->>B: hi')],
        } as HastElement,
      ],
    });
    expect(wrapMermaidFences(root)).toBe(1);
  });
});
