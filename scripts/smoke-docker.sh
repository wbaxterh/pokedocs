#!/usr/bin/env bash
# S1.7.2 acceptance: the docker target must build and serve a scaffolded
# site from a REAL container run — nginx try_files, non-root runtime,
# agent artifacts included. Needs a docker daemon; run from the repo root
# after `pnpm build`. Not part of CI (the in-container chromium download
# defeats caching) — run before releases and after touching the target.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/pokedocs-docker-smoke.XXXXXX")"
SITE="$WORK/smoke-site"
IMAGE="pokedocs-docker-smoke"
CONTAINER="pokedocs-docker-smoke-run"
PORT=18080
cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker rmi -f "$IMAGE" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

echo "==> scaffolding"
node "$ROOT/packages/create-pokedocs/dist/cli.js" "$SITE" --yes

echo "==> packing workspace packages into the docker context"
mkdir -p "$SITE/.pokedocs-tarballs"
declare -A TARBALL
for pkg in preset theme plugin-mermaid-ssr plugin-agent-endpoints plugin-frontmatter-schema; do
  out="$(cd "$ROOT/packages/$pkg" && pnpm pack --pack-destination "$SITE/.pokedocs-tarballs" | tail -1)"
  TARBALL[$pkg]="$(basename "$out")"
done

node - "$SITE" "${TARBALL[preset]}" "${TARBALL[theme]}" "${TARBALL[plugin-mermaid-ssr]}" "${TARBALL[plugin-agent-endpoints]}" "${TARBALL[plugin-frontmatter-schema]}" <<'EOF'
const fs = require('node:fs');
const path = require('node:path');
const [site, preset, theme, mermaid, agent, frontmatter] = process.argv.slice(2);
const file = path.join(site, 'package.json');
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
// Relative file: specs so the docker build resolves them inside the context.
pkg.dependencies['@pokedocs/preset'] = `file:./.pokedocs-tarballs/${preset}`;
pkg.overrides = {
  '@pokedocs/theme': `file:./.pokedocs-tarballs/${theme}`,
  '@pokedocs/plugin-mermaid-ssr': `file:./.pokedocs-tarballs/${mermaid}`,
  '@pokedocs/plugin-agent-endpoints': `file:./.pokedocs-tarballs/${agent}`,
  '@pokedocs/plugin-frontmatter-schema': `file:./.pokedocs-tarballs/${frontmatter}`,
};
fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
EOF

echo "==> pokedocs deploy init docker"
(cd "$SITE" && node "$ROOT/packages/pokedocs/dist/cli.js" deploy init docker)

# Test-harness patch, not a product change: real sites resolve @pokedocs
# from the registry, so the generated Dockerfile's manifest-only first
# layer is correct. This smoke site's deps are file: tarballs, which must
# exist before `npm ci` runs.
sed -i.bak 's|^COPY package.json package-lock.json\* ./$|COPY package.json package-lock.json* ./\nCOPY .pokedocs-tarballs ./.pokedocs-tarballs|' "$SITE/Dockerfile"
rm "$SITE/Dockerfile.bak"
grep -q ".pokedocs-tarballs ./.pokedocs-tarballs" "$SITE/Dockerfile" || { echo "FAIL: tarball patch did not apply"; exit 1; }

echo "==> docker build (installs, renders mermaid via chromium, builds)"
# Placeholder url is expected in this throwaway site; the ARG override
# (S1.7.3) keeps the in-container production build warning-free.
(cd "$SITE" && docker build \
  --build-arg POKEDOCS_URL=https://docs.smoke.test \
  -t "$IMAGE" .)

echo "==> docker run"
docker run -d --name "$CONTAINER" -p "$PORT:8080" "$IMAGE" >/dev/null
sleep 2

fail() { echo "FAIL: $1"; exit 1; }
code() { curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT$1"; }

[ "$(code /)" = "200" ] || fail "root not served ($(code /))"
[ "$(code /intro/)" = "200" ] || fail "doc route not served"
[ "$(code /intro.md)" = "200" ] || fail "markdown twin not served"
[ "$(code /llms.txt)" = "200" ] || fail "llms.txt not served"
[ "$(code /does-not-exist)" = "404" ] || fail "missing route should 404"
curl -s "http://localhost:$PORT/does-not-exist" | grep -qi "page.*not.*found\|404" || fail "404 page not the docusaurus one"
curl -s "http://localhost:$PORT/intro.md" | grep -q "# Get started" || fail "twin content wrong"
curl -s "http://localhost:$PORT/authoring/" | grep -q "data-mermaid-source" || fail "mermaid SSR missing in container"

UID_IN_CONTAINER="$(docker exec "$CONTAINER" id -u)"
[ "$UID_IN_CONTAINER" != "0" ] || fail "container runs as root"

echo "OK: container serves the scaffolded site (nginx try_files, twins, llms.txt, 404, non-root uid $UID_IN_CONTAINER)"
