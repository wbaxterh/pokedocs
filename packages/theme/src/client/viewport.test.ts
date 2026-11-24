import { describe, expect, it } from 'vitest';
import {
  FIT_CAP,
  FIT_PADDING,
  fitView,
  MAX_ZOOM,
  panBy,
  wheelFactor,
  zoomAt,
  zoomLimits,
} from './viewport.js';

describe('fitView', () => {
  it('scales a wide diagram down to the stage and centres it', () => {
    const view = fitView({ w: 2000, h: 500 }, { w: 1064, h: 800 });
    expect(view.k).toBeCloseTo((1064 - FIT_PADDING * 2) / 2000);
    expect(view.x).toBeCloseTo(FIT_PADDING);
    expect(view.y).toBeCloseTo((800 - 500 * view.k) / 2);
  });

  it('is limited by height for a tall diagram', () => {
    const view = fitView({ w: 300, h: 3000 }, { w: 1200, h: 664 });
    expect(view.k).toBeCloseTo((664 - FIT_PADDING * 2) / 3000);
    expect(view.y).toBeCloseTo(FIT_PADDING);
  });

  it('does not blow a small diagram up past the cap', () => {
    const view = fitView({ w: 100, h: 60 }, { w: 1200, h: 800 });
    expect(view.k).toBe(FIT_CAP);
    expect(view.x).toBeCloseTo((1200 - 100 * FIT_CAP) / 2);
  });

  it('stays positive when the stage is smaller than the padding', () => {
    expect(fitView({ w: 500, h: 500 }, { w: 40, h: 40 }).k).toBeGreaterThan(0);
  });
});

describe('zoomLimits', () => {
  it('lets a shrunk diagram go to half its fitted size', () => {
    expect(zoomLimits({ k: 0.4, x: 0, y: 0 })).toEqual({
      min: 0.2,
      max: MAX_ZOOM,
    });
  });

  it('lets an enlarged diagram go to half its natural size', () => {
    expect(zoomLimits({ k: 2, x: 0, y: 0 }).min).toBe(0.5);
  });
});

describe('zoomAt', () => {
  const limits = { min: 0.25, max: MAX_ZOOM };

  it('keeps the diagram point under the cursor fixed', () => {
    const before = { k: 0.5, x: 120, y: 80 };
    const px = 400;
    const py = 300;
    const after = zoomAt(before, px, py, 1.8, limits);
    // The same diagram-space point must sit under the cursor both times.
    expect((px - after.x) / after.k).toBeCloseTo((px - before.x) / before.k);
    expect((py - after.y) / after.k).toBeCloseTo((py - before.y) / before.k);
    expect(after.k).toBeCloseTo(0.9);
  });

  it('clamps at the maximum and stops moving', () => {
    const atMax = zoomAt({ k: MAX_ZOOM, x: 10, y: 20 }, 300, 300, 4, limits);
    expect(atMax).toEqual({ k: MAX_ZOOM, x: 10, y: 20 });
  });

  it('clamps at the minimum', () => {
    expect(zoomAt({ k: 0.3, x: 0, y: 0 }, 0, 0, 0.01, limits).k).toBe(0.25);
  });
});

describe('panBy', () => {
  it('moves the offset and leaves the scale alone', () => {
    expect(panBy({ k: 1.5, x: 10, y: 10 }, -30, 5)).toEqual({
      k: 1.5,
      x: -20,
      y: 15,
    });
  });
});

describe('wheelFactor', () => {
  it('zooms in when scrolling up and out when scrolling down', () => {
    expect(wheelFactor(-120, 0, false)).toBeGreaterThan(1);
    expect(wheelFactor(120, 0, false)).toBeLessThan(1);
  });

  it('treats line-mode deltas as 16 pixels each', () => {
    expect(wheelFactor(-3, 1, false)).toBeCloseTo(wheelFactor(-48, 0, false));
  });

  it('is more sensitive for a trackpad pinch', () => {
    expect(wheelFactor(-10, 0, true)).toBeGreaterThan(
      wheelFactor(-10, 0, false),
    );
  });
});
