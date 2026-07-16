#!/usr/bin/env node
/**
 * PokeDocs PRD -> branded PDF.
 *
 * Two-pass render: a full-bleed cover (zero margins) and the margined content
 * document (with page-number footers) are printed separately in headless
 * Chrome, then merged with pdf-lib. Mermaid fences render as SVG in-browser
 * with the brand theme before printing.
 *
 * Usage: node scripts/generate-pdf.js [input.md] [output.pdf]
 */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');

const DOC = {
  title: 'PokeDocs',
  subtitle: 'Product Requirements Document',
  version: 'V1.0',
  author: 'Wesley Huber',
  date: 'July 14, 2026',
  repo: 'github.com/wbaxterh/pokedocs',
  tagline: 'Docs that humans love — and agents can actually read.',
  stats: [
    ['05', 'pillars'],
    ['06', 'milestones'],
    ['23', 'features'],
    ['51', 'user stories'],
  ],
};

const input = process.argv[2] || path.join(__dirname, '..', 'pokedocs-prd-v1.md');
const output = process.argv[3] || path.join(__dirname, '..', 'output', 'pokedocs-prd-v1.pdf');

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const renderer = {
  code(code, infostring) {
    const lang = (infostring || '').trim().toLowerCase();
    if (lang === 'mermaid') {
      return `<figure class="screen"><div class="screen-leds"><i></i><i></i><i></i></div><pre class="mermaid">${escapeHtml(code)}</pre></figure>`;
    }
    return `<pre class="code-block"><code>${escapeHtml(code)}</code></pre>`;
  },
};
marked.use({ gfm: true, renderer });

const FONTS =
  '<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Public+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">';

const PALETTE = `
  --red: #D8232A;
  --red-deep: #8E1014;
  --yellow: #FFCB05;
  --amber: #B07E00;
  --lens: #2EA8E0;
  --ink: #201A16;
  --ink-soft: #5C534B;
  --paper: #FFFDF8;
  --paper-warm: #F6F0E4;
  --line: #E3DACB;
`;

/* ---------------------------------- cover ---------------------------------- */

function coverHtml() {
  const stats = DOC.stats
    .map(([n, l]) => `<div class="stat"><span class="n">${n}</span><span class="l">${l}</span></div>`)
    .join('');
  const pillars = [
    ['01', 'Diagram-native'],
    ['02', 'Branded in one line'],
    ['03', 'Drift-aware'],
    ['04', 'Agent-readable by default'],
    ['05', 'Host anywhere'],
  ]
    .map(([n, t]) => `<div class="pillar"><span class="pn">${n}</span>${t}</div>`)
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${FONTS}<style>
  :root { ${PALETTE} }
  * { margin: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; }
  html, body { width: 215.9mm; height: 279.4mm; }
  body { font-family: 'Public Sans', sans-serif; background: var(--red); color: #FFF6EE; display: flex; flex-direction: column; }

  .top { flex: 1; padding: 16mm 16mm 10mm; display: flex; flex-direction: column; justify-content: space-between; }
  .lens-row { display: flex; align-items: center; gap: 7mm; }
  .lens { width: 26mm; height: 26mm; border-radius: 50%; background: #FFF6EE;
          display: flex; align-items: center; justify-content: center; }
  .lens-inner { width: 20mm; height: 20mm; border-radius: 50%;
          background: radial-gradient(circle at 34% 30%, #BDE8FF 0%, var(--lens) 42%, #0E5E8C 100%); position: relative; }
  .lens-inner::after { content: ''; position: absolute; top: 2.8mm; left: 3.4mm; width: 4.8mm; height: 4.8mm;
          border-radius: 50%; background: rgba(255,255,255,0.85); }
  .leds { display: flex; gap: 3mm; }
  .leds i { width: 4.8mm; height: 4.8mm; border-radius: 50%; display: block; }
  .leds i:nth-child(1) { background: var(--yellow); }
  .leds i:nth-child(2) { background: #FF8A80; }
  .leds i:nth-child(3) { background: #7ADB8F; }

  .kicker { font-family: 'Space Mono', monospace; font-size: 11pt; letter-spacing: 0.32em; color: #FFD9C9; }
  .wordmark { font-family: 'Archivo Black', sans-serif; font-size: 88pt; line-height: 0.96;
              margin-top: 5mm; letter-spacing: -0.015em; color: #FFF6EE; }
  .wordmark em { font-style: normal; color: var(--yellow); }
  .tagline { font-size: 20pt; font-weight: 700; line-height: 1.3; margin-top: 10mm; max-width: 172mm; color: #FFE9DD; }
  .tagline b { color: var(--yellow); font-weight: 700; }

  .pillars { border-top: 1.4px solid rgba(255,246,238,0.4); padding-top: 6mm; }
  .pillar { font-family: 'Archivo Black', sans-serif; font-size: 15.5pt; line-height: 1.72; color: #FFF6EE;
            letter-spacing: 0.01em; }
  .pillar .pn { font-family: 'Space Mono', monospace; font-size: 10.5pt; font-weight: 400;
                color: var(--yellow); margin-right: 5mm; letter-spacing: 0.18em; }

  .hinge { height: 3.4mm; background: var(--red-deep); }

  .base { background: var(--ink); padding: 10mm 16mm 12mm; }
  .stats { display: flex; gap: 5mm; }
  .stat { border: 1.2px solid #4A423B; border-radius: 2.2mm; padding: 3.4mm 5mm; min-width: 30mm; }
  .stat .n { font-family: 'Archivo Black', sans-serif; font-size: 19pt; color: var(--yellow); display: block; }
  .stat .l { font-family: 'Space Mono', monospace; font-size: 8pt; letter-spacing: 0.14em; color: #B8AEA4;
             text-transform: uppercase; }
  .meta { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10mm;
          font-family: 'Space Mono', monospace; font-size: 9pt; color: #B8AEA4; }
  .meta .doc { color: #FFF6EE; font-size: 10.5pt; }
  .meta .right { text-align: right; line-height: 1.7; }
  .meta .right b { color: var(--yellow); font-weight: 400; }
</style></head><body>
  <div class="top">
    <div class="lens-row">
      <div class="lens"><div class="lens-inner"></div></div>
      <div class="leds"><i></i><i></i><i></i></div>
    </div>
    <div style="height:0"></div>
    <div>
      <div class="kicker">${DOC.subtitle.toUpperCase()} · ${DOC.version}</div>
      <div class="wordmark">Poke<em>Docs</em></div>
      <div class="tagline">Docs that humans love —<br>and agents can actually read.<br><b>Built in minutes. Hosted anywhere.</b></div>
    </div>
    <div class="pillars">${pillars}</div>
  </div>
  <div class="hinge"></div>
  <div class="base">
    <div class="stats">${stats}</div>
    <div class="meta">
      <div><div class="doc">${DOC.author}</div>${DOC.date}</div>
      <div class="right">OPEN SOURCE · MIT<br><b>${DOC.repo}</b></div>
    </div>
  </div>
</body></html>`;
}

/* --------------------------------- content --------------------------------- */

function contentHtml(bodyHtml, tocItems) {
  const toc = tocItems
    .map((t, i) => `<div class="toc-item"><span class="toc-n">${String(i + 1).padStart(2, '0')}</span>${t}</div>`)
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${FONTS}<style>
  :root { ${PALETTE} }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
  body { font-family: 'Public Sans', sans-serif; font-size: 10pt; line-height: 1.58; color: var(--ink);
         margin: 0; background: var(--paper); }
  p { margin: 0.55em 0 0.9em; }
  strong { font-weight: 700; }
  a { color: var(--red); text-decoration: none; font-weight: 600; }
  em { color: inherit; }
  h2, h3, h4 { break-after: avoid; }
  p, li { orphans: 3; widows: 3; }

  /* contents strip */
  .contents { border: 1.4px solid var(--ink); border-radius: 2.4mm; padding: 5mm 6mm 4mm; margin: 0 0 9mm;
              background: var(--paper); }
  .contents-label { font-family: 'Space Mono', monospace; font-size: 8pt; letter-spacing: 0.3em; color: var(--red);
                    margin-bottom: 2.8mm; }
  .toc-grid { columns: 2; column-gap: 8mm; }
  .toc-item { font-size: 8.6pt; font-weight: 600; padding: 1.1mm 0; break-inside: avoid; }
  .toc-n { font-family: 'Space Mono', monospace; color: var(--amber); margin-right: 2.4mm; font-weight: 400; }

  /* section headings */
  h2 { font-family: 'Archivo Black', sans-serif; font-size: 17.5pt; line-height: 1.15; margin: 12mm 0 4mm; }
  h2 .idx { display: block; font-family: 'Space Mono', monospace; font-size: 9.5pt; letter-spacing: 0.28em;
            color: var(--red); margin-bottom: 1.6mm; }
  h2::after { content: ''; display: block; width: 16mm; height: 1.9mm; background: var(--yellow); margin-top: 2.4mm; }
  h3 { font-size: 12pt; font-weight: 700; margin: 7mm 0 2.5mm; }
  h3 .idx, h4 .idx { font-family: 'Space Mono', monospace; color: var(--red); font-weight: 700; margin-right: 1.6mm; }
  h4 { font-size: 10.5pt; font-weight: 700; margin: 6mm 0 2mm; }

  /* pillar quote + emphasis */
  blockquote { margin: 1.2em 0; padding: 0; border: none; }
  blockquote p { font-family: 'Archivo Black', sans-serif; font-size: 13.5pt; line-height: 1.5; margin: 0; }
  blockquote strong { background: linear-gradient(transparent 58%, var(--yellow) 58%, var(--yellow) 94%, transparent 94%);
                      font-weight: 400; font-family: inherit; }

  code { font-family: 'Space Mono', monospace; font-size: 0.82em; background: var(--paper-warm);
         border-radius: 1mm; padding: 0.5px 4px; box-decoration-break: clone; -webkit-box-decoration-break: clone;
         overflow-wrap: anywhere; }
  pre.code-block { background: var(--ink); color: #F3EDE5; padding: 4mm 5mm; border-radius: 2mm;
                   break-inside: avoid; }
  pre.code-block code { background: none; padding: 0; font-size: 8.2pt; }

  /* story id + feature chips */
  .sid { font-family: 'Space Mono', monospace; font-size: 0.8em; font-weight: 700; background: var(--yellow);
         color: var(--ink); border-radius: 1mm; padding: 0.5px 4px; margin-right: 2px; }

  table { border-collapse: collapse; width: 100%; margin: 3mm 0 5mm; font-size: 8.6pt; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th { background: var(--ink); color: var(--paper); text-align: left; padding: 2.4mm 2.8mm; font-weight: 700;
       border-top: 2.4px solid var(--red); }
  td { padding: 2.1mm 2.8mm; border-bottom: 1px solid var(--line); vertical-align: top; }
  tr:nth-child(even) td { background: var(--paper-warm); }
  td code, th code { background: rgba(0,0,0,0.06); }
  th code { background: rgba(255,255,255,0.14); color: var(--yellow); }

  ul, ol { padding-left: 5.5mm; margin: 0.4em 0 1em; }
  li { margin: 0.3em 0; break-inside: avoid; }
  li li { break-inside: auto; }
  hr { border: none; border-top: 1px solid var(--line); margin: 5mm 0; }

  /* mermaid device screens */
  figure.screen { margin: 4mm 0 6mm; border: 1.4px solid var(--ink); border-radius: 2.4mm;
                  padding: 4mm 4mm 3mm; background: #FFFFFC; break-inside: avoid; position: relative; }
  .screen-leds { position: absolute; top: 3mm; right: 3.5mm; display: flex; gap: 1.6mm; }
  .screen-leds i { width: 2.1mm; height: 2.1mm; border-radius: 50%; display: block; }
  .screen-leds i:nth-child(1) { background: var(--red); }
  .screen-leds i:nth-child(2) { background: var(--yellow); }
  .screen-leds i:nth-child(3) { background: var(--lens); }
  figure.screen pre.mermaid { text-align: center; margin: 0; }
  figure.screen svg { max-width: 100%; height: auto; }
</style></head><body>
  <div class="contents"><div class="contents-label">CONTENTS</div><div class="toc-grid">${toc}</div></div>
  ${bodyHtml}
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        fontFamily: 'Public Sans, sans-serif', fontSize: '13px',
        primaryColor: '#FFF3C2', primaryBorderColor: '#201A16', primaryTextColor: '#201A16',
        secondaryColor: '#FBE3E4', tertiaryColor: '#F6F0E4',
        lineColor: '#201A16', clusterBkg: '#FAF6EC', clusterBorder: '#B8AEA4',
        titleColor: '#201A16',
        ganttTaskBkgColor: '#FFF3C2',
      },
      flowchart: { padding: 10, nodeSpacing: 34, rankSpacing: 42 },
      gantt: { useWidth: 860, barHeight: 24, barGap: 6, fontSize: 12, sectionFontSize: 12,
               leftPadding: 120, topPadding: 46, axisFormat: '%b %Y', todayMarker: 'off' }
    });
    await document.fonts.ready;
    try { await mermaid.run({ querySelector: '.mermaid' }); }
    catch (e) { console.error('MERMAID_ERROR: ' + (e && e.message)); }
    /* brand the gantt bars; keep label contrast per bar color */
    const bars = [...document.querySelectorAll('svg .task')];
    const labels = [...document.querySelectorAll('svg .taskText')];
    bars.forEach((r, i) => {
      const red = i % 2 === 1;
      r.style.fill = red ? '#D8232A' : '#FFCB05';
      r.style.stroke = '#201A16';
      if (labels[i]) {
        const inside = labels[i].classList.contains('taskTextOutsideRight') ||
                       labels[i].classList.contains('taskTextOutsideLeft') ? false : true;
        labels[i].style.fill = red && inside ? '#FFF6EE' : '#201A16';
      }
    });
    window.__renderDone = true;
  </script>
</body></html>`;
}

/* ------------------------------ transformations ----------------------------- */

function transform(md) {
  // Drop the H1 + metadata table: content starts at the first "## " heading.
  const cut = md.slice(md.indexOf('\n## ') + 1);
  const tocItems = [...cut.matchAll(/^## \d+\. (.+)$/gm)].map((m) => m[1]);
  let html = marked.parse(cut);

  // hr directly before a section heading strands whitespace — drop it.
  html = html.replace(/<hr\s*\/?>\s*(<h[23])/g, '$1');

  // "1. Executive Summary" -> index kicker + title
  html = html.replace(/<h2>(\d+)\.\s+([^<]*)<\/h2>/g,
    (_, n, t) => `<h2><span class="idx">SECTION ${String(n).padStart(2, '0')}</span>${t}</h2>`);

  // colorize h3/h4 leading indexes: "2.1", "M0 —", "F1.3"
  html = html.replace(/<h3>(M\d|\d+\.\d+)\b/g, '<h3><span class="idx">$1</span>');
  html = html.replace(/<h4>(F\d\.\d)\b/g, '<h4><span class="idx">$1</span>');

  // story ids -> yellow chips inside story bullets
  html = html.replace(/<strong>(S\d\.\d\.\d) — /g, '<strong><span class="sid">$1</span> ');

  return { html, tocItems };
}

/* ---------------------------------- render ---------------------------------- */

async function printPage(browser, html, pdfOptions) {
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.text().includes('MERMAID_ERROR')) console.error(msg.text());
  });
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  if (html.includes('__renderDone')) {
    await page.waitForFunction('window.__renderDone === true', { timeout: 30000 });
  }
  const buf = await page.pdf({ format: 'Letter', printBackground: true, ...pdfOptions });
  await page.close();
  return buf;
}

(async () => {
  const md = fs.readFileSync(input, 'utf8');
  const { html, tocItems } = transform(md);

  fs.mkdirSync(path.dirname(output), { recursive: true });
  if (process.env.POKEDOCS_DUMP_HTML) {
    fs.writeFileSync(path.join(path.dirname(output), '_cover.html'), coverHtml());
    fs.writeFileSync(path.join(path.dirname(output), '_content.html'), contentHtml(html, tocItems));
    console.log('Dumped debug HTML to output/_cover.html and output/_content.html');
  }
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const coverPdf = await printPage(browser, coverHtml(), {
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    const bodyPdf = await printPage(browser, contentHtml(html, tocItems), {
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        `<div style="width:100%; padding: 0 15mm; display:flex; justify-content:space-between; ` +
        `font-size:7px; font-family: monospace; color:#8A8178; letter-spacing:0.12em;">` +
        `<span>POKEDOCS · PRD ${DOC.version}</span>` +
        `<span>PAGE <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    });

    const merged = await PDFDocument.create();
    for (const buf of [coverPdf, bodyPdf]) {
      const doc = await PDFDocument.load(buf);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }
    fs.writeFileSync(output, await merged.save());
    console.log(`Generated: ${output}`);
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
