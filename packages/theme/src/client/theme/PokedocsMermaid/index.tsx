/**
 * @theme/PokedocsMermaid — the frame around every build-time diagram (S5.1.1).
 *
 * Renders the baked SVG as-is plus an Expand button. The pan/zoom viewer is
 * a separate chunk fetched only once a diagram is on the page, so sites pay
 * nothing for it elsewhere. Swizzle this component to change the frame.
 */

import {
  type ComponentProps,
  type ComponentType,
  lazy,
  type MouseEvent as ReactMouseEvent,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from 'react';
import '../../../../css/mermaid.css';
import type { ViewerProps } from '../../Viewer.js';

const loadViewer = () =>
  import(/* webpackChunkName: "pokedocs-mermaid-viewer" */ '../../Viewer.js');

// This package compiles to CommonJS, and bundlers disagree on whether a
// dynamic import of CommonJS puts the component on `default` or one level
// further down, so accept both.
const Viewer = lazy(async () => {
  const loaded = (await loadViewer()) as unknown as {
    default:
      | ComponentType<ViewerProps>
      | { default: ComponentType<ViewerProps> };
  };
  const component =
    typeof loaded.default === 'function'
      ? loaded.default
      : loaded.default.default;
  return { default: component };
});

const EXPAND_ICON = 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7';

export type Props = ComponentProps<'div'>;

export default function PokedocsMermaid({
  children,
  className,
  ...rest
}: Props) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  // Warm the viewer chunk while the browser is idle so Expand opens at once.
  useEffect(() => {
    const idle =
      window.requestIdleCallback ??
      ((run: () => void) => window.setTimeout(run, 1200));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => void loadViewer());
    return () => cancel(handle);
  }, []);

  const onInlineClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('a')) return;
    if (window.getSelection()?.toString()) return;
    setOpen(true);
  };

  return (
    <div
      {...rest}
      className={[className, 'pokedocs-mermaid--interactive']
        .filter(Boolean)
        .join(' ')}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: click-to-expand is a mouse shortcut; the Expand button is the keyboard and screen-reader path */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: same as above */}
      <div className="pokedocs-mermaid__inline" onClick={onInlineClick}>
        {children}
      </div>
      <button
        type="button"
        className="pokedocs-mermaid__expand"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Expand diagram to pan and zoom"
        title="Expand to pan and zoom"
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d={EXPAND_ICON} />
        </svg>
        <span>Expand</span>
      </button>
      {open && (
        <Suspense fallback={null}>
          <Viewer onClose={close}>{children}</Viewer>
        </Suspense>
      )}
    </div>
  );
}
