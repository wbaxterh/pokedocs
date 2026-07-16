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

test('mermaid architecture diagram renders as SVG', async ({ page }) => {
  await page.goto('./architecture');
  // Client-side render today (@docusaurus/theme-mermaid); when F1.3 lands
  // this assertion tightens to "SVG present in static HTML without JS".
  const diagram = page.locator('.docusaurus-mermaid-container svg').first();
  await expect(diagram).toBeVisible({ timeout: 15_000 });
  await expect(diagram.locator('text=@pokedocs/preset').first()).toBeVisible();
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
