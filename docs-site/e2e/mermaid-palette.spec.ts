import { type Browser, expect, type Page, test } from '@playwright/test';
import { compileBranding } from '@pokedocs/theme';

// S5.1.2: diagram colors derive from the brand per color mode, per-mode
// overrides work, and the two known bugs (dark-mode contrast, diagrams in
// tabs) stay fixed.

const BASE = 'http://localhost:3517/pokedocs/';
const DIAGRAM_PAGES = ['architecture', 'diagrams'];
const branding = compileBranding({ brandColor: '#D8232A' });
/** The dark-only override set in docusaurus.config.ts. */
const DARK_CLUSTER_STROKE = 'rgb(138, 143, 152)';

type Mode = 'light' | 'dark';

async function openIn(browser: Browser, mode: Mode, path: string) {
  const context = await browser.newContext({ colorScheme: mode });
  const page = await context.newPage();
  await page.goto(BASE + path);
  await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
  return { context, page };
}

function hexToRgb(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

/**
 * Measures WCAG contrast for every edge, arrowhead, node label, subgraph
 * label, edge label and sequence text in every diagram on the page, against
 * the surface it actually sits on. Returns what was counted and what failed.
 */
async function auditContrast(page: Page) {
  return page.evaluate(() => {
    type Rgba = { r: number; g: number; b: number; a: number };
    const parse = (c: string | null): Rgba | null => {
      if (!c || c === 'none' || c === 'transparent') return null;
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1]
        .split(/[,\s/]+/)
        .filter(Boolean)
        .map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const over = (fg: Rgba | null, bg: Rgba): Rgba =>
      !fg
        ? bg
        : {
            r: fg.r * fg.a + bg.r * (1 - fg.a),
            g: fg.g * fg.a + bg.g * (1 - fg.a),
            b: fg.b * fg.a + bg.b * (1 - fg.a),
            a: 1,
          };
    const channel = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (c: Rgba) =>
      0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
    const contrast = (a: Rgba, b: Rgba) => {
      const la = luminance(a);
      const lb = luminance(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    const style = (el: Element) => getComputedStyle(el);
    // The surface a diagram really sits on: every background between it and
    // the root, composited. A site that puts diagrams on a card of its own
    // is measured against that card, not against the page.
    const surfaceBehind = (el: Element): Rgba => {
      const layers: Rgba[] = [];
      for (let at: Element | null = el; at; at = at.parentElement) {
        const bg = parse(style(at).backgroundColor);
        if (bg && bg.a > 0) layers.push(bg);
        if (bg && bg.a === 1) break;
      }
      const opaque = layers.at(-1)?.a === 1;
      let surface: Rgba = opaque
        ? (layers.pop() as Rgba)
        : { r: 255, g: 255, b: 255, a: 1 };
      while (layers.length > 0) surface = over(layers.pop() as Rgba, surface);
      return surface;
    };

    const counts = { diagrams: 0, lines: 0, markers: 0, labels: 0 };
    const failures: string[] = [];
    const fail = (kind: string, el: Element, ratio: number) =>
      failures.push(
        `${kind} ${ratio.toFixed(2)}:1 <${el.tagName} class="${el.getAttribute('class') ?? ''}"> "${(el.textContent ?? '').trim().slice(0, 24)}"`,
      );
    const textColor = (el: Element) =>
      parse(
        el.tagName.toLowerCase() === 'text' ||
          el.tagName.toLowerCase() === 'tspan'
          ? style(el).fill
          : style(el).color,
      );

    for (const svg of document.querySelectorAll(
      '.pokedocs-mermaid__inline > svg',
    )) {
      // A diagram in a hidden tab has no box and nothing to read.
      if (svg.getBoundingClientRect().width === 0) continue;
      counts.diagrams++;
      const pageBg = surfaceBehind(svg);

      for (const el of svg.querySelectorAll(
        '.flowchart-link, .messageLine0, .messageLine1, .actor-line, .loopLine',
      )) {
        counts.lines++;
        const stroke = parse(style(el).stroke);
        const ratio = stroke ? contrast(over(stroke, pageBg), pageBg) : 1;
        if (ratio < 3) fail('line', el, ratio);
      }

      for (const el of svg.querySelectorAll('marker > *')) {
        counts.markers++;
        const fill = parse(style(el).fill);
        const stroke = parse(style(el).stroke);
        const strokeWidth = Number.parseFloat(style(el).strokeWidth) || 0;
        const ratio = Math.max(
          fill ? contrast(over(fill, pageBg), pageBg) : 1,
          stroke && strokeWidth > 0
            ? contrast(over(stroke, pageBg), pageBg)
            : 1,
        );
        if (ratio < 3) fail('arrowhead', el, ratio);
      }

      for (const node of svg.querySelectorAll('g.node, g.cluster')) {
        const shape = node.querySelector(
          ':scope > rect, :scope > circle, :scope > ellipse, :scope > polygon, :scope > path, :scope > g > path, :scope > g > rect, :scope > g > polygon',
        );
        const label = node.querySelector('.nodeLabel, .label text, text');
        if (!shape || !label?.textContent?.trim()) continue;
        counts.labels++;
        const surface = over(parse(style(shape).fill), pageBg);
        const color = textColor(label);
        const ratio = color ? contrast(over(color, surface), surface) : 1;
        if (ratio < 4.5) fail('label', label, ratio);
      }

      for (const el of svg.querySelectorAll('span.edgeLabel')) {
        if (!el.textContent?.trim()) continue;
        counts.labels++;
        const p = el.querySelector('p') ?? el;
        const surface = over(
          parse(style(p).backgroundColor),
          over(parse(style(el).backgroundColor), pageBg),
        );
        const color = parse(style(p).color);
        const ratio = color ? contrast(over(color, surface), surface) : 1;
        if (ratio < 4.5) fail('edge label', el, ratio);
      }

      const fillOf = (selector: string) => {
        const el = svg.querySelector(selector);
        return el ? over(parse(style(el).fill), pageBg) : pageBg;
      };
      const sequenceText: Array<[string, string | null]> = [
        ['text.messageText', null],
        ['text.actor > tspan', 'rect.actor'],
        ['text.noteText > tspan', '.note'],
        ['.labelText', '.labelBox'],
        ['.loopText', null],
      ];
      for (const [selector, surfaceSelector] of sequenceText) {
        for (const el of svg.querySelectorAll(selector)) {
          if (!el.textContent?.trim()) continue;
          counts.labels++;
          const surface = surfaceSelector ? fillOf(surfaceSelector) : pageBg;
          const color = textColor(el);
          const ratio = color ? contrast(over(color, surface), surface) : 1;
          if (ratio < 4.5) fail(`sequence text (${selector})`, el, ratio);
        }
      }
    }
    return { counts, failures };
  });
}

for (const mode of ['light', 'dark'] as const) {
  test(`every diagram part is readable in ${mode} mode`, async ({
    browser,
  }) => {
    for (const path of DIAGRAM_PAGES) {
      const { context, page } = await openIn(browser, mode, path);
      const { counts, failures } = await auditContrast(page);
      // Guard against a vacuous pass: the audit must have found real parts.
      expect(counts.diagrams, `${path}: diagrams audited`).toBeGreaterThan(0);
      expect(counts.lines, `${path}: lines audited`).toBeGreaterThan(0);
      expect(counts.markers, `${path}: arrowheads audited`).toBeGreaterThan(0);
      expect(counts.labels, `${path}: labels audited`).toBeGreaterThan(0);
      expect(failures, `${path} in ${mode} mode`).toEqual([]);
      await context.close();
    }
  });
}

test('the contrast audit fails when the palette is removed in dark mode', async ({
  browser,
}) => {
  // The control for the test above: with the recoloring switched off, the
  // baked light palette on a dark page must be caught.
  const { context, page } = await openIn(browser, 'dark', 'architecture');
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('.pokedocs-mermaid')) {
      el.classList.remove('pokedocs-mermaid');
    }
  });
  const { failures } = await auditContrast(page);
  expect(failures.some((f) => f.startsWith('line'))).toBe(true);
  expect(failures.some((f) => f.startsWith('arrowhead'))).toBe(true);
  await context.close();
});

for (const mode of ['light', 'dark'] as const) {
  test(`node outlines use the compiled brand primary in ${mode} mode`, async ({
    browser,
  }) => {
    const { context, page } = await openIn(browser, mode, 'architecture');
    const stroke = await page
      .locator('.pokedocs-mermaid__inline g.node > rect')
      .first()
      .evaluate((el) => getComputedStyle(el).stroke);
    expect(stroke).toBe(hexToRgb(branding[mode].primary));

    // The fill is a tint of that primary: closer to the page than the
    // outline is, and not mermaid's baked lavender.
    const fill = await page
      .locator('.pokedocs-mermaid__inline g.node > rect')
      .first()
      .evaluate((el) => getComputedStyle(el).fill);
    expect(fill).not.toBe('rgb(236, 236, 255)');
    expect(fill).not.toBe(stroke);
    await context.close();
  });
}

test('a per-mode override applies in its mode only', async ({ browser }) => {
  const strokeIn = async (mode: Mode) => {
    const { context, page } = await openIn(browser, mode, 'architecture');
    const stroke = await page
      .locator('.pokedocs-mermaid__inline g.cluster > rect')
      .first()
      .evaluate((el) => getComputedStyle(el).stroke);
    await context.close();
    return stroke;
  };
  expect(await strokeIn('dark')).toBe(DARK_CLUSTER_STROKE);
  expect(await strokeIn('light')).not.toBe(DARK_CLUSTER_STROKE);
});

test('colors set in the diagram win over the palette', async ({ browser }) => {
  for (const mode of ['light', 'dark'] as const) {
    const { context, page } = await openIn(browser, mode, 'diagrams');
    const node = (label: string) =>
      page
        .locator('.pokedocs-mermaid__inline g.node')
        .filter({ hasText: label })
        .first();

    const styled = node('hand-colored').first();
    expect(
      await styled
        .locator(':scope > rect')
        .evaluate((el) => getComputedStyle(el).fill),
      `${mode}: style fill is kept`,
    ).toBe('rgb(255, 243, 205)');

    const classed = node('hand-colored, with text color');
    expect(
      await classed
        .locator('.nodeLabel')
        .evaluate((el) => getComputedStyle(el).color),
      `${mode}: classDef text color is kept`,
    ).toBe('rgb(13, 71, 161)');
    await context.close();
  }
});

test('a diagram in an initially hidden tab renders and expands', async ({
  page,
}) => {
  await page.goto('./diagrams');
  await page.getByRole('tab', { name: 'Diagram', exact: true }).click();
  const panel = page.getByRole('tabpanel').filter({ hasText: 'database' });
  const svg = panel.locator('.pokedocs-mermaid__inline > svg');
  await expect(svg).toBeVisible();
  const box = await svg.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(100);
  expect(box?.height ?? 0).toBeGreaterThan(20);
  await expect(svg.locator('g.node')).toHaveCount(3);

  await panel.getByRole('button', { name: /Expand diagram/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Diagram viewer' });
  await expect(dialog.locator('g.node')).toHaveCount(3);
});

test('the viewer shows the same palette as the page', async ({ browser }) => {
  const { context, page } = await openIn(browser, 'dark', 'architecture');
  const inline = await page
    .locator('.pokedocs-mermaid__inline .flowchart-link')
    .first()
    .evaluate((el) => getComputedStyle(el).stroke);
  await page.locator('.pokedocs-mermaid__expand').first().click();
  const inViewer = await page
    .locator('.pokedocs-mermaid-viewer__content .flowchart-link')
    .first()
    .evaluate((el) => getComputedStyle(el).stroke);
  expect(inViewer).toBe(inline);
  await context.close();
});

test('a diagram page hydrates in place, with no React error', async ({
  page,
}) => {
  // The HTML minifier rewrites mermaid's inline <style>; as a text child
  // that mismatch made React report #418, discard the server-rendered
  // diagram and render it again a moment after load.
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  for (const path of DIAGRAM_PAGES) {
    await page.goto(`./${path}`);
    const node = await page
      .locator('.pokedocs-mermaid__inline g.node')
      .first()
      .elementHandle();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(
      await node?.evaluate((el) => el.isConnected),
      `${path}: the server-rendered node is still in the document`,
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
