/**
 * Pan/zoom math for the mermaid viewer (S5.1.1). Pure, so it is unit-tested
 * without a browser: a view is the diagram's scale plus the offset of its
 * top-left corner inside the stage.
 */

export interface Size {
  w: number;
  h: number;
}

export interface View {
  /** Scale relative to the diagram's natural (viewBox) size. */
  k: number;
  x: number;
  y: number;
}

export interface ZoomLimits {
  min: number;
  max: number;
}

/** Largest scale offered; an SVG laid out wider than this stops being useful. */
export const MAX_ZOOM = 8;
/** A small diagram is not blown up past this when fitted to the stage. */
export const FIT_CAP = 2;
/** Breathing room kept around a fitted diagram, in CSS pixels. */
export const FIT_PADDING = 32;

/** Scale and centre the diagram so all of it is visible in the stage. */
export function fitView(natural: Size, stage: Size): View {
  const exact = Math.min(
    (stage.w - FIT_PADDING * 2) / natural.w,
    (stage.h - FIT_PADDING * 2) / natural.h,
  );
  const k = Math.max(Math.min(exact, FIT_CAP), 0.02);
  return {
    k,
    x: (stage.w - natural.w * k) / 2,
    y: (stage.h - natural.h * k) / 2,
  };
}

/** Zoom-out stops at half the fitted size (or half natural size, if smaller). */
export function zoomLimits(fitted: View): ZoomLimits {
  return { min: Math.min(fitted.k, 1) * 0.5, max: MAX_ZOOM };
}

/**
 * Scale by `factor` while keeping the diagram point under (px, py) — stage
 * coordinates — exactly where it is. This is what makes wheel and pinch zoom
 * feel anchored to the cursor.
 */
export function zoomAt(
  view: View,
  px: number,
  py: number,
  factor: number,
  limits: ZoomLimits,
): View {
  const k = Math.min(Math.max(view.k * factor, limits.min), limits.max);
  const ratio = k / view.k;
  return {
    k,
    x: px - (px - view.x) * ratio,
    y: py - (py - view.y) * ratio,
  };
}

export function panBy(view: View, dx: number, dy: number): View {
  return { ...view, x: view.x + dx, y: view.y + dy };
}

/** Wheel delta to zoom factor; ctrl+wheel is how trackpads report a pinch. */
export function wheelFactor(
  deltaY: number,
  deltaMode: number,
  pinch: boolean,
): number {
  const unit = deltaMode === 1 ? 16 : 1;
  return Math.exp(-deltaY * unit * (pinch ? 0.01 : 0.0015));
}
