#!/usr/bin/env bash
# Smoke test for S1.1.1's acceptance criterion: a scaffolded site BUILDS
# CLEAN. Packs the local @pokedocs packages as tarballs (they are not on
# npm yet / the site must test THIS code, not the registry), scaffolds
# with --yes, installs with npm like a real user, and runs a production
# build. Run from the repo root after `pnpm build`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/pokedocs-smoke.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
SITE="$WORK/smoke-site"

echo "==> packing workspace packages"
declare -A TARBALL
for pkg in preset theme plugin-mermaid-ssr plugin-agent-endpoints plugin-frontmatter-schema; do
  out="$(cd "$ROOT/packages/$pkg" && pnpm pack --pack-destination "$WORK" | tail -1)"
  TARBALL[$pkg]="$out"
  echo "    $pkg -> $(basename "$out")"
done

echo "==> scaffolding with --yes"
node "$ROOT/packages/create-pokedocs/dist/cli.js" "$SITE" --yes

echo "==> pointing @pokedocs deps at the packed tarballs"
node - "$SITE" "${TARBALL[preset]}" "${TARBALL[theme]}" "${TARBALL[plugin-mermaid-ssr]}" "${TARBALL[plugin-agent-endpoints]}" "${TARBALL[plugin-frontmatter-schema]}" <<'EOF'
const fs = require('node:fs');
const path = require('node:path');
const [site, preset, theme, mermaid, agent, frontmatter] = process.argv.slice(2);
const file = path.join(site, 'package.json');
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
pkg.dependencies['@pokedocs/preset'] = `file:${preset}`;
pkg.overrides = {
  '@pokedocs/theme': `file:${theme}`,
  '@pokedocs/plugin-mermaid-ssr': `file:${mermaid}`,
  '@pokedocs/plugin-agent-endpoints': `file:${agent}`,
  '@pokedocs/plugin-frontmatter-schema': `file:${frontmatter}`,
};
fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
EOF

cd "$SITE"
echo "==> npm install"
npm install --no-audit --no-fund --loglevel=error
echo "==> ensuring chromium for build-time mermaid"
npx playwright install chromium
echo "==> building the scaffolded site"
npm run build

echo "==> verifying the build carries the preset capabilities"
grep -q "ifm-color-primary" build/index.html || { echo "FAIL: branding CSS missing"; exit 1; }
test -f build/search-index.json || { echo "FAIL: search index missing"; exit 1; }
grep -q "data-mermaid-source" build/authoring/index.html || { echo "FAIL: mermaid SSR missing"; exit 1; }
echo "OK: scaffolded site builds clean with branding, search, and mermaid SSR"
