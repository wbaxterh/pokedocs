import { expect, test } from '@playwright/test';

test('homepage renders with brand and content', async ({ page }) => {
  await page.goto('.');
  await expect(page).toHaveTitle(/PokeDocs/);
  await expect(page.getByRole('heading', { level: 1, name: 'PokeDocs' })).toBeVisible();
  await expect(page.getByAltText('PokeDocs lens logo')).toBeVisible();
});

test('sidebar navigation reaches every section', async ({ page }) => {
  await page.goto('.');
  const sidebar = page.getByRole('complementary').or(page.locator('.theme-doc-sidebar-container'));
  await sidebar.getByRole('link', { name: 'Architecture' }).click();
  await expect(page).toHaveURL(/\/architecture/);
  await expect(page.getByRole('heading', { level: 1, name: 'Architecture' })).toBeVisible();

  await sidebar.getByRole('link', { name: 'Roadmap' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Roadmap' })).toBeVisible();
});

test('mermaid diagram is baked into static HTML with source preserved', async ({ page }) => {
  // F1.3: the raw HTML must carry BOTH the inline SVG (S1.3.1) and the
  // verbatim mermaid source for agents (S1.3.2) — no JavaScript involved.
  const res = await page.request.get('./architecture');
  const html = await res.text();
  expect(html).toContain('data-mermaid-source');
  expect(html).toContain('graph TB');
  expect(html).toMatch(/pokedocs-mermaid[^>]*>[\s\S]*?<svg/);
});

test('mermaid diagram is visible with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://localhost:3517/pokedocs/architecture');
  const diagram = page.locator('.pokedocs-mermaid svg').first();
  await expect(diagram).toBeVisible();
  await expect(page.locator('.pokedocs-mermaid').first()).toContainText('@pokedocs/preset');
  await context.close();
});

test('color mode toggle switches themes', async ({ page }) => {
  await page.goto('.');
  const html = page.locator('html');
  const initial = await html.getAttribute('data-theme');
  // With respectPrefersColorScheme the toggle cycles system → light → dark,
  // so the first click may only change the choice, not the applied theme.
  const toggle = page.getByRole('button', { name: /switch between dark and light/i });
  await toggle.click();
  if ((await html.getAttribute('data-theme')) === initial) {
    await toggle.click();
  }
  await expect(html).not.toHaveAttribute('data-theme', initial ?? '');
});
