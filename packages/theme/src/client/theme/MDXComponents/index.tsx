/**
 * @theme/MDXComponents — routes the mermaid wrapper to its viewer (S5.1.1).
 *
 * @pokedocs/plugin-mermaid-ssr emits `<div class="pokedocs-mermaid">` around
 * each baked SVG. Markdown-generated elements pass through this map, so that
 * one div becomes `@theme/PokedocsMermaid` and every other div is untouched.
 * No DOM patching, no observers: it is ordinary component substitution.
 */

import PokedocsMermaid from '@theme/PokedocsMermaid';
import MDXComponents from '@theme-init/MDXComponents';
import type { ComponentProps } from 'react';

/** Must match WRAPPER_CLASS in @pokedocs/plugin-mermaid-ssr. */
const WRAPPER_CLASS = 'pokedocs-mermaid';

function Div(props: ComponentProps<'div'>) {
  const { className } = props;
  if (
    typeof className === 'string' &&
    className.split(/\s+/).includes(WRAPPER_CLASS)
  ) {
    return <PokedocsMermaid {...props} />;
  }
  return <div {...props} />;
}

export default {
  ...MDXComponents,
  div: Div,
};
