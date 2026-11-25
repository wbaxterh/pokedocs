/**
 * The pop-out mermaid viewer (S5.1.1): a modal <dialog> with wheel/pinch
 * zoom, drag pan, keyboard shortcuts and a full-screen mode.
 *
 * Loaded as its own chunk by `@theme/PokedocsMermaid`, so none of this ships
 * to pages without a diagram.
 */

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import '../../css/mermaid-viewer.css';
import {
  fitView,
  MAX_ZOOM,
  panBy,
  type Size,
  type View,
  wheelFactor,
  type ZoomLimits,
  zoomAt,
  zoomLimits,
} from './viewport.js';

const PAN_STEP = 80;

const ICONS = {
  zoomIn: 'M12 5v14M5 12h14',
  zoomOut: 'M5 12h14',
  fullscreen: 'M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5',
  exitFullscreen: 'M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5',
  close: 'M6 6l12 12M18 6L6 18',
};

function Icon({ d }: { d: string }) {
  return (
    <svg
      className="pokedocs-mermaid-viewer__icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

export interface ViewerProps {
  /** The build-time SVG, rendered a second time inside the dialog. */
  children: ReactNode;
  onClose: () => void;
}

export default function Viewer({ children, onClose }: ViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const view = useRef<View>({ k: 1, x: 0, y: 0 });
  const natural = useRef<Size>({ w: 1, h: 1 });
  const limits = useRef<ZoomLimits>({ min: 0.1, max: MAX_ZOOM });
  const frame = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  const [percent, setPercent] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [dragging, setDragging] = useState(false);

  // The diagram is resized, not CSS-scaled, so text and lines stay sharp at
  // every zoom level; panning is a plain translate.
  const paint = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = contentRef.current;
      if (!el) return;
      const { x, y, k } = view.current;
      el.style.width = `${natural.current.w * k}px`;
      el.style.height = `${natural.current.h * k}px`;
      el.style.transform = `translate(${x}px, ${y}px)`;
      setPercent(Math.round(k * 100));
    });
  }, []);

  const fit = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fitted = fitView(natural.current, {
      w: stage.clientWidth,
      h: stage.clientHeight,
    });
    limits.current = zoomLimits(fitted);
    view.current = fitted;
    paint();
  }, [paint]);

  const zoom = useCallback(
    (px: number, py: number, factor: number) => {
      view.current = zoomAt(view.current, px, py, factor, limits.current);
      paint();
    },
    [paint],
  );

  const zoomCentered = useCallback(
    (factor: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      zoom(stage.clientWidth / 2, stage.clientHeight / 2, factor);
    },
    [zoom],
  );

  const actualSize = useCallback(() => {
    zoomCentered(1 / view.current.k);
  }, [zoomCentered]);

  const pan = useCallback(
    (dx: number, dy: number) => {
      view.current = panBy(view.current, dx, dy);
      paint();
    },
    [paint],
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      // A <dialog> may not go full screen itself, so the frame inside it does.
      void frameRef.current?.requestFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    const stage = stageRef.current;
    const svg = contentRef.current?.querySelector('svg');
    if (!dialog || !stage || !svg) return undefined;

    const box = svg.viewBox.baseVal;
    const rect = svg.getBoundingClientRect();
    natural.current = {
      w: box?.width ? box.width : rect.width || 1,
      h: box?.height ? box.height : rect.height || 1,
    };

    if (!dialog.open) dialog.showModal();
    setCanFullscreen(
      document.fullscreenEnabled &&
        typeof frameRef.current?.requestFullscreen === 'function',
    );
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    fit();

    // React registers wheel listeners as passive; zooming has to cancel the
    // scroll, so this one is attached by hand.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const bounds = stage.getBoundingClientRect();
      zoom(
        event.clientX - bounds.left,
        event.clientY - bounds.top,
        wheelFactor(event.deltaY, event.deltaMode, event.ctrlKey),
      );
    };
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === frameRef.current);
      fit();
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('resize', fit);

    return () => {
      stage.removeEventListener('wheel', onWheel);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('resize', fit);
      cancelAnimationFrame(frame.current);
      root.style.overflow = previousOverflow;
      if (document.fullscreenElement) void document.exitFullscreen();
      if (dialog.open) dialog.close();
    };
  }, [fit, zoom]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const current = { x: event.clientX, y: event.clientY };

    if (pointers.current.size === 1) {
      pan(current.x - previous.x, current.y - previous.y);
    } else if (pointers.current.size === 2) {
      const other = [...pointers.current.entries()].find(
        ([id]) => id !== event.pointerId,
      )?.[1];
      if (other) {
        const before = Math.hypot(previous.x - other.x, previous.y - other.y);
        const after = Math.hypot(current.x - other.x, current.y - other.y);
        const bounds = event.currentTarget.getBoundingClientRect();
        // One finger moved, so the midpoint moved by half of that.
        view.current = panBy(
          view.current,
          (current.x - previous.x) / 2,
          (current.y - previous.y) / 2,
        );
        if (before > 0) {
          zoom(
            (current.x + other.x) / 2 - bounds.left,
            (current.y + other.y) / 2 - bounds.top,
            after / before,
          );
        }
      }
    }
    pointers.current.set(event.pointerId, current);
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) setDragging(false);
  };

  const onDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    zoom(
      event.clientX - bounds.left,
      event.clientY - bounds.top,
      event.shiftKey ? 0.5 : 2,
    );
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const actions: Record<string, () => void> = {
      '+': () => zoomCentered(1.25),
      '=': () => zoomCentered(1.25),
      '-': () => zoomCentered(0.8),
      _: () => zoomCentered(0.8),
      '0': fit,
      '1': actualSize,
      f: toggleFullscreen,
      F: toggleFullscreen,
      ArrowLeft: () => pan(PAN_STEP, 0),
      ArrowRight: () => pan(-PAN_STEP, 0),
      ArrowUp: () => pan(0, PAN_STEP),
      ArrowDown: () => pan(0, -PAN_STEP),
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="pokedocs-mermaid-viewer"
      aria-label="Diagram viewer"
      onClose={onClose}
      onKeyDown={onKeyDown}
    >
      <div ref={frameRef} className="pokedocs-mermaid-viewer__frame">
        <div className="pokedocs-mermaid-viewer__toolbar">
          <span className="pokedocs-mermaid-viewer__hint">
            Scroll to zoom, drag to pan, double-click to zoom in
          </span>
          {/* biome-ignore lint/a11y/useSemanticElements: a toolbar group, not a form fieldset */}
          <div
            className="pokedocs-mermaid-viewer__controls"
            role="group"
            aria-label="Diagram zoom"
          >
            <button
              type="button"
              className="pokedocs-mermaid-viewer__button"
              onClick={() => zoomCentered(0.8)}
              aria-label="Zoom out"
              title="Zoom out (-)"
            >
              <Icon d={ICONS.zoomOut} />
            </button>
            <button
              type="button"
              className="pokedocs-mermaid-viewer__button pokedocs-mermaid-viewer__percent"
              onClick={actualSize}
              aria-label={`Zoom ${percent} percent. Reset to 100 percent`}
              title="Actual size (1)"
            >
              {percent}%
            </button>
            <button
              type="button"
              className="pokedocs-mermaid-viewer__button"
              onClick={() => zoomCentered(1.25)}
              aria-label="Zoom in"
              title="Zoom in (+)"
            >
              <Icon d={ICONS.zoomIn} />
            </button>
            <button
              type="button"
              className="pokedocs-mermaid-viewer__button"
              onClick={fit}
              aria-label="Fit diagram to screen"
              title="Fit to screen (0)"
            >
              Fit
            </button>
            {canFullscreen && (
              <button
                type="button"
                className="pokedocs-mermaid-viewer__button"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
                aria-pressed={isFullscreen}
                title={
                  isFullscreen ? 'Exit full screen (F)' : 'Full screen (F)'
                }
              >
                <Icon
                  d={isFullscreen ? ICONS.exitFullscreen : ICONS.fullscreen}
                />
              </button>
            )}
            <button
              type="button"
              className="pokedocs-mermaid-viewer__button pokedocs-mermaid-viewer__close"
              onClick={onClose}
              aria-label="Close diagram viewer"
              title="Close (Esc)"
            >
              <Icon d={ICONS.close} />
            </button>
          </div>
        </div>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer pan surface; every action here has a toolbar button and a key */}
        <div
          ref={stageRef}
          className={
            dragging
              ? 'pokedocs-mermaid-viewer__stage pokedocs-mermaid-viewer__stage--dragging'
              : 'pokedocs-mermaid-viewer__stage'
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onDoubleClick={onDoubleClick}
        >
          <div ref={contentRef} className="pokedocs-mermaid-viewer__content">
            {children}
          </div>
        </div>
      </div>
    </dialog>
  );
}
