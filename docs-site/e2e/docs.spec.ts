import { expect, test } from '@playwright/test';
import { compileBranding } from '@pokedocs/theme';

// F1.4: recompile the site's branding block here and assert the served page
// carries exactly the compiled ladder — config in, theme out, no custom.css.
const branding = compileBranding({ brandColor: '#D8232A' });

async function readPrimaryVar(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue('--ifm-color-primary')
      .trim(),
  );
}

test('favicon is injected from the branding block (S1.2.1)', async ({
  page,
}) => {
  await page.goto('.');
  await expect(
    page.locator('link[rel="icon"][href="/pokedocs/img/logo-badge.svg"]'),
  ).toHaveCount(1);
});

test('search returns results with zero signup (S1.6.1)', async ({ page }) => {
  await page.goto('.');
  const input = page.getByPlaceholder(/search/i).first();
  await input.click();
  await input.fill('branding');
  await expect(
    page.getByRole('listbox').getByRole('option', { name: /branding/i }).first(),
  ).toBeVisible();
});

test('branding ladder is compiled into the page (light mode)', async ({
  browser,
}) => {
  const context = await browser.newContext({ colorScheme: 'light' });
  const page = await context.newPage();
  await page.goto('http://localhost:3517/pokedocs/');
  expect(await readPrimaryVar(page)).toBe(branding.light.primary);
  await context.close();
});

test('dark mode uses the lifted primary, not a darkened one (S1.4.2)', async ({
  browser,
}) => {
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto('http://localhost:3517/pokedocs/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await readPrimaryVar(page)).toBe(branding.dark.primary);
  await context.close();
});

test('homepage renders with brand and content', async ({ page }) => {
  await page.goto('.');
  await expect(page).toHaveTitle(/PokeDocs/);
  await expect(page.getByRole('heading', { level: 1, name: 'PokeDocs' })).toBeVisible();
  await expect(page.getByAltText('PokeDocs badge logo')).toBeVisible();
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

test('llms.txt indexes the site for agents (S1.5.1)', async ({ page }) => {
  const res = await page.request.get('./llms.txt');
  expect(res.status()).toBe(200);
  const text = await res.text();
  expect(text).toContain('# PokeDocs');
  expect(text).toMatch(/^> /m); // llmstxt.org summary blockquote
  expect(text).toMatch(/- \[Architecture\]\(https:\/\/.+\/architecture\.md\): /);
});

test('llms-full.txt carries the whole corpus with mermaid source (S1.5.1)', async ({
  page,
}) => {
  const text = await (await page.request.get('./llms-full.txt')).text();
  expect(text).toContain('# Architecture');
  expect(text).toContain('```mermaid');
  expect(text).toContain('graph TB');
});

test('pages.json is the stable machine-readable index (S2.2.2)', async ({
  page,
}) => {
  const res = await page.request.get('./pages.json');
  expect(res.status()).toBe(200);
  const index = await res.json();
  expect(index.site.title).toBe('PokeDocs');
  const architecture = index.pages.find((p: { title: string }) =>
    p.title.includes('Architecture'),
  );
  expect(architecture.description).toBeTruthy();
  expect(architecture.markdownUrl).toMatch(/\/architecture\.md$/);
});

test('every doc page has a markdown twin, mermaid intact (S1.5.2)', async ({
  page,
}) => {
  const md = await (await page.request.get('./architecture.md')).text();
  expect(md.startsWith('# Architecture')).toBe(true);
  expect(md).toContain('graph TB');
  expect(md).not.toContain('sidebar_position'); // frontmatter stripped
  // The root doc (slug /) twins as /index.md.
  const root = await (await page.request.get('./index.md')).text();
  expect(root).toContain('# PokeDocs');
});

test('discovery links point at the agent surface (S1.5.3)', async ({ page }) => {
  const html = await (await page.request.get('./architecture')).text();
  expect(html).toContain(
    '<link rel="alternate" type="text/markdown" href="/pokedocs/architecture.md"',
  );
  expect(html).toMatch(/<link[^>]+href="?\/pokedocs\/llms\.txt/);
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
