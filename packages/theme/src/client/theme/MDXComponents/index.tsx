/**
 * @theme/MDXComponents — routes the mermaid wrapper to its viewer (S5.1.1).
 *
 * @pokedocs/plugin-mermaid-ssr emits `<div class="pokedocs-mermaid">` around
 * each baked SVG. Markdown-generated elements pass through this map, so that
 * one div becomes `@theme/PokedocsMermaid` and every other div is untouched.
 * No DOM patching, no observers: it is ordinary component substitution.
 *
 * It also keeps the diagram's inline `<style>` from breaking hydration
 * (S5.1.2), see `Style` below.
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

/**
 * Mermaid ships its CSS in a `<style>` inside each SVG. The production HTML
 * minifier rewrites that CSS, so as a text child it no longer matches what
 * React expects at hydration: React reports error #418, throws the
 * server-rendered diagram away and renders it again. As raw HTML the element
 * is left exactly as the server sent it, and the diagram hydrates in place.
 */
function Style({ children, ...props }: ComponentProps<'style'>) {
  if (typeof children === 'string') {
    return (
      <style
        {...props}
        suppressHydrationWarning
        // biome-ignore lint/security/noDangerouslySetInnerHtml: build-time CSS from the site's own markdown, never user input
        dangerouslySetInnerHTML={{ __html: children }}
      />
    );
  }
  return <style {...props}>{children}</style>;
}

export default {
  ...MDXComponents,
  div: Div,
  style: Style,
};
