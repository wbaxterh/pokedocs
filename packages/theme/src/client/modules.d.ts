// Docusaurus resolves these aliases at bundle time; declared here so the
// theme components type-check without the site's module-type-aliases.

declare module '@theme-init/MDXComponents' {
  import type { ComponentType } from 'react';

  // biome-ignore lint/suspicious/noExplicitAny: the upstream map is heterogeneous by design
  const MDXComponents: Record<string, ComponentType<any>>;
  export default MDXComponents;
}

declare module '@theme/PokedocsMermaid' {
  import type { ComponentProps, ReactNode } from 'react';

  export type Props = ComponentProps<'div'>;
  export default function PokedocsMermaid(props: Props): ReactNode;
}
