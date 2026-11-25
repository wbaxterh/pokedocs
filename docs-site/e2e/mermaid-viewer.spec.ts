import { expect, type Page, test } from '@playwright/test';

// S5.1.1: zoom, pan and full screen on every diagram, with no per-site code.
// docs-site has no swizzled component and no mermaid config; the preset
// alone must deliver everything asserted here.

const DIAGRAM_PAGE = './architecture';
const PLAIN_PAGE = './branding';
const VIEWER_CHUNK = /pokedocs-mermaid-viewer\.[0-9a-f]+\.js/;

async function openViewer(page: Page) {
  await page.goto(DIAGRAM_PAGE);
  await page
    .getByRole('button', { name: 'Expand diagram to pan and zoom' })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'Diagram viewer' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('svg').first()).toBeVisible();
  return dialog;
}

/** Position and size of the diagram inside the open viewer. */
async function diagramBox(page: Page) {
  const box = await page
    .locator('.pokedocs-mermaid-viewer__content')
    .boundingBox();
  if (!box) throw new Error('viewer content has no box');
  return box;
}

async function zoomPercent(page: Page) {
  const text = await page
    .locator('.pokedocs-mermaid-viewer__percent')
    .textContent();
  return Number.parseInt(text ?? '', 10);
}

test('every diagram carries an Expand control, in the static HTML', async ({
  browser,
}) => {
  // JavaScript off: the control has to be in what the server sends.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://localhost:3517/pokedocs/architecture');
  const diagrams = page.locator('.pokedocs-mermaid');
  const count = await diagrams.count();
  expect(count).toBeGreaterThan(0);
  await expect(
    page.locator('.pokedocs-mermaid > .pokedocs-mermaid__expand'),
  ).toHaveCount(count);
  // The agent contract (S1.3.2) survives the wrapper.
  await expect(diagrams.first()).toHaveAttribute(
    'data-mermaid-source',
    /graph TB/,
  );
  await context.close();
});

test('the viewer chunk loads on a diagram page and not elsewhere', async ({
  page,
}) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));

  await page.goto(PLAIN_PAGE);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  expect(requested.filter((url) => VIEWER_CHUNK.test(url))).toEqual([]);
  await expect(page.locator('.pokedocs-mermaid__expand')).toHaveCount(0);

  const viewerChunk = page.waitForRequest(VIEWER_CHUNK);
  await page.goto(DIAGRAM_PAGE);
  await viewerChunk;
});

test('expand opens a full-window viewer fitted to the stage', async ({
  page,
}) => {
  const dialog = await openViewer(page);
  const viewport = page.viewportSize();
  const frame = await dialog.boundingBox();
  expect(frame?.width).toBe(viewport?.width);
  expect(frame?.height).toBe(viewport?.height);

  const stage = await page
    .locator('.pokedocs-mermaid-viewer__stage')
    .boundingBox();
  const box = await diagramBox(page);
  if (!stage) throw new Error('no stage');
  expect(box.x).toBeGreaterThanOrEqual(stage.x);
  expect(box.y).toBeGreaterThanOrEqual(stage.y);
  expect(box.x + box.width).toBeLessThanOrEqual(stage.x + stage.width);
  expect(box.y + box.height).toBeLessThanOrEqual(stage.y + stage.height);
});

test('clicking the diagram itself opens the viewer', async ({ page }) => {
  await page.goto(DIAGRAM_PAGE);
  await page.locator('.pokedocs-mermaid__inline').first().click();
  await expect(
    page.getByRole('dialog', { name: 'Diagram viewer' }),
  ).toBeVisible();
});

test('wheel zoom stays anchored to the cursor', async ({ page }) => {
  await openViewer(page);
  const node = page.locator('.pokedocs-mermaid-viewer__content .node').first();
  const before = await node.boundingBox();
  if (!before) throw new Error('no node');
  const cx = before.x + before.width / 2;
  const cy = before.y + before.height / 2;
  const startPercent = await zoomPercent(page);

  await page.mouse.move(cx, cy);
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -120);
  await expect
    .poll(() => zoomPercent(page))
    .toBeGreaterThan(startPercent * 1.5);

  const after = await node.boundingBox();
  if (!after) throw new Error('no node after zoom');
  expect(Math.abs(after.x + after.width / 2 - cx)).toBeLessThan(3);
  expect(Math.abs(after.y + after.height / 2 - cy)).toBeLessThan(3);
  expect(after.width).toBeGreaterThan(before.width * 1.5);
});

test('dragging pans the diagram', async ({ page }) => {
  await openViewer(page);
  const before = await diagramBox(page);
  const stage = await page
    .locator('.pokedocs-mermaid-viewer__stage')
    .boundingBox();
  if (!stage) throw new Error('no stage');
  const startX = stage.x + stage.width / 2;
  const startY = stage.y + stage.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 140, startY + 60, { steps: 6 });
  await page.mouse.up();

  await expect.poll(async () => (await diagramBox(page)).x).not.toBe(before.x);
  const after = await diagramBox(page);
  expect(after.x - before.x).toBeCloseTo(-140, 0);
  expect(after.y - before.y).toBeCloseTo(60, 0);
  expect(after.width).toBeCloseTo(before.width, 0);
});

test('the whole viewer works from the keyboard', async ({ page }) => {
  await page.goto(DIAGRAM_PAGE);
  const expand = page
    .getByRole('button', { name: 'Expand diagram to pan and zoom' })
    .first();
  await expand.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Diagram viewer' });
  await expect(dialog).toBeVisible();

  // Focus lands inside the dialog, on a labelled control.
  await expect(dialog.locator(':focus')).toHaveAttribute('aria-label', /.+/);

  const fitted = await zoomPercent(page);
  await page.keyboard.press('+');
  await expect.poll(() => zoomPercent(page)).toBeGreaterThan(fitted);
  await page.keyboard.press('1');
  await expect.poll(() => zoomPercent(page)).toBe(100);
  await page.keyboard.press('-');
  await expect.poll(() => zoomPercent(page)).toBe(80);

  const beforePan = await diagramBox(page);
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(async () => (await diagramBox(page)).x)
    .toBeLessThan(beforePan.x);

  await page.keyboard.press('0');
  await expect.poll(() => zoomPercent(page)).toBe(fitted);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  // Focus returns to the control that opened it, and the page scrolls again.
  await expect(expand).toBeFocused();
  expect(
    await page.evaluate(() => document.documentElement.style.overflow),
  ).toBe('');
});

test('full screen is entered and left from the toolbar', async ({ page }) => {
  await openViewer(page);
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => document.fullscreenElement?.className ?? null),
    )
    .toBe('pokedocs-mermaid-viewer__frame');

  await page.getByRole('button', { name: 'Exit full screen' }).click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === null))
    .toBe(true);

  // Closing while full screen must not leave the page stuck there.
  await page.keyboard.press('f');
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement !== null))
    .toBe(true);
  await page.getByRole('button', { name: 'Close diagram viewer' }).click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === null))
    .toBe(true);
});

test('the viewer is opaque in both colour modes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    await page.goto('http://localhost:3517/pokedocs/architecture');
    await page.locator('.pokedocs-mermaid__expand').first().click();
    const stage = page.locator('.pokedocs-mermaid-viewer__stage');
    await expect(stage).toBeVisible();
    const alpha = await stage.evaluate((el) => {
      const parts = getComputedStyle(el).backgroundColor.match(/[\d.]+/g) ?? [];
      return parts.length > 3 ? Number(parts[3]) : 1;
    });
    expect(alpha, `${colorScheme} stage must hide the page behind it`).toBe(1);
    await context.close();
  }
});

test('a phone-width viewer keeps its controls on screen and pinch-zooms', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 800 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('http://localhost:3517/pokedocs/architecture');
  await page.locator('.pokedocs-mermaid__expand').first().click();
  const close = page.getByRole('button', { name: 'Close diagram viewer' });
  await expect(close).toBeVisible();
  const closeBox = await close.boundingBox();
  expect((closeBox?.x ?? 0) + (closeBox?.width ?? 0)).toBeLessThanOrEqual(390);

  const before = await zoomPercent(page);
  const cdp = await context.newCDPSession(page);
  const touch = (type: string, points: Array<[number, number]>) =>
    cdp.send('Input.dispatchTouchEvent', {
      type: type as 'touchStart',
      touchPoints: points.map(([x, y], id) => ({ x, y, id })),
    });
  await touch('touchStart', [
    [150, 400],
    [240, 400],
  ]);
  for (let i = 1; i <= 6; i++) {
    await touch('touchMove', [
      [150 - i * 12, 400],
      [240 + i * 12, 400],
    ]);
  }
  await touch('touchEnd', []);
  await expect.poll(() => zoomPercent(page)).toBeGreaterThan(before * 1.5);
  await context.close();
});
