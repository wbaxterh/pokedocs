#!/usr/bin/env node
/**
 * Render a PRD markdown file to a Material Design styled PDF.
 * Pipeline: marked (md -> html) -> HTML template (Material CSS + mermaid.js) -> puppeteer print.
 * Mermaid fences render as real SVG in headless Chrome before the PDF is captured.
 *
 * Usage: node scripts/generate-pdf.js [input.md] [output.pdf]
 */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

const DOC = {
  title: 'PokeDocs',
  subtitle: 'Product Requirements Document — v1.0',
  author: 'Wesley Huber',
  date: 'July 14, 2026',
};

const input = process.argv[2] || path.join(__dirname, '..', 'pokedocs-prd-v1.md');
const output = process.argv[3] || path.join(__dirname, '..', 'output', 'pokedocs-prd-v1.pdf');

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const renderer = {
  code(code, infostring) {
    const lang = (infostring || '').trim().toLowerCase();
    if (lang === 'mermaid') {
      return `<div class="mermaid-wrap"><pre class="mermaid">${escapeHtml(code)}</pre></div>`;
    }
    return `<pre class="code-block"><code class="lang-${lang}">${escapeHtml(code)}</code></pre>`;
  },
};

marked.use({ gfm: true, renderer });

function buildHtml(bodyHtml) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root { }
  * { box-sizing: border-box; }
  body {
    font-family: 'Noto Sans', -apple-system, sans-serif;
    font-size: 10.5pt; line-height: 1.65; color: #212121;
    margin: 0; padding: 0;
  }
  .document-header {
    background: linear-gradient(135deg, #1976D2 0%, #1565C0 60%, #0D47A1 100%);
    color: #fff; padding: 34px 40px; border-radius: 10px; margin-bottom: 28px;
  }
  .document-header .brand { font-weight: 700; font-size: 1.05rem; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.9; }
  .document-header h1 { margin: 6px 0 4px; font-size: 2rem; }
  .document-header .subtitle { font-size: 1.05rem; opacity: 0.95; }
  .document-header .metadata { margin-top: 10px; font-size: 0.85rem; opacity: 0.9; }
  h1, h2, h3, h4 { color: #0D47A1; line-height: 1.3; }
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.25rem; border-bottom: 2px solid #1976D2; padding-bottom: 6px; margin-top: 2em; page-break-after: avoid; }
  h3 { font-size: 1.05rem; color: #1565C0; margin-top: 1.6em; page-break-after: avoid; }
  h4 { font-size: 0.95rem; color: #424242; margin-top: 1.4em; page-break-after: avoid; }
  hr { border: none; border-top: 1px solid #E0E0E0; margin: 1.8em 0; }
  a { color: #1976D2; text-decoration: none; }
  blockquote {
    margin: 1em 0; padding: 10px 18px; border-left: 4px solid #1976D2;
    background: #E3F2FD; border-radius: 0 6px 6px 0; font-size: 1.02em;
  }
  code { font-family: 'Fira Code', monospace; font-size: 0.86em; background: #F5F5F5; border: 1px solid #E0E0E0; border-radius: 4px; padding: 1px 5px; }
  pre.code-block { background: #263238; color: #ECEFF1; padding: 14px 16px; border-radius: 8px; overflow-x: auto; page-break-inside: avoid; }
  pre.code-block code { background: none; border: none; color: inherit; font-size: 0.82em; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.86em; page-break-inside: avoid; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
  th { background: #1976D2; color: #fff; text-align: left; padding: 8px 10px; }
  td { padding: 7px 10px; border-bottom: 1px solid #E0E0E0; vertical-align: top; }
  tr:nth-child(even) td { background: #FAFAFA; }
  ul, ol { padding-left: 1.4em; }
  li { margin: 0.25em 0; }
  .mermaid-wrap { text-align: center; margin: 1.2em 0; page-break-inside: avoid; }
  .mermaid-wrap svg { max-width: 100%; height: auto; }
  strong { color: #212121; }
  /* Major sections start on a new page (## headings), except the first after the header */
  h2 { page-break-before: always; }
  .document-header + h2, h2.no-break { page-break-before: avoid; }
</style>
</head>
<body>
  <div class="document-header">
    <div class="brand">PokeDocs</div>
    <h1>${DOC.title} — ${DOC.subtitle}</h1>
    <div class="metadata">${DOC.author} &nbsp;|&nbsp; ${DOC.date}</div>
  </div>
  ${bodyHtml}
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#E3F2FD', primaryBorderColor: '#1976D2', primaryTextColor: '#0D47A1',
        lineColor: '#1565C0', fontFamily: 'Noto Sans, sans-serif', fontSize: '14px'
      },
      flowchart: { padding: 12 },
      gantt: { barHeight: 22, fontSize: 12 }
    });
    // Wait for webfonts before mermaid measures text, or node labels get clipped.
    await document.fonts.ready;
    try {
      await mermaid.run({ querySelector: '.mermaid' });
    } catch (e) {
      console.error('MERMAID_ERROR: ' + (e && e.message));
    }
    window.__renderDone = true;
  </script>
</body>
</html>`;
}

(async () => {
  const md = fs.readFileSync(input, 'utf8');
  // Strip the H1 + metadata table at the top; the styled header replaces them.
  let body = marked.parse(md.replace(/^# .*\n/, ''));
  // Drop <hr> directly before an <h2>: the h2 already page-breaks, so the hr strands a blank page.
  body = body.replace(/<hr\s*\/?>\s*(<h2)/g, '$1');
  const html = buildHtml(body);

  fs.mkdirSync(path.dirname(output), { recursive: true });
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    page.on('console', (msg) => {
      if (msg.text().includes('MERMAID_ERROR')) console.error(msg.text());
    });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('window.__renderDone === true', { timeout: 30000 });
    await page.pdf({
      path: output,
      format: 'Letter',
      printBackground: true,
      margin: { top: '18mm', bottom: '16mm', left: '15mm', right: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="width:100%; text-align:center; font-size:8px; color:#9E9E9E; font-family: sans-serif;">' +
        'PokeDocs PRD v1.0 &nbsp;·&nbsp; <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    });
    console.log(`Generated: ${output}`);
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
