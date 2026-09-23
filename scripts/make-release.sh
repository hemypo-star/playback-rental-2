#!/usr/bin/env bash
# Build the deploy-only branch that goes to the VDS.
#
#   ./scripts/make-release.sh [target-branch] [source-ref]
#
# The release branch is GENERATED, never hand-edited. Everything below is a
# deletion or a mechanical transformation of the development branch, so cutting
# a new release is "run this again" rather than "merge and re-clean by hand" —
# which is the failure mode a manually pruned branch hits on its first merge,
# when every deleted file comes straight back.
#
# What survives is what a running server needs: the app, its migrations, the
# МойСклад and notification workers, the Docker image and the compose stack.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"

# This script deletes scripts/, including itself, so it runs from a copy —
# bash reads a script incrementally and would otherwise be reading a file that
# no longer exists halfway through.
if [ "${MAKE_RELEASE_REEXEC:-}" != "1" ]; then
  self="$(mktemp -t make-release.XXXXXX)"
  cp "$0" "$self"
  chmod +x "$self"
  MAKE_RELEASE_REEXEC=1 MAKE_RELEASE_REPO="$REPO" "$self" "$@"
  status=$?
  rm -f "$self"
  exit $status
fi
cd "${MAKE_RELEASE_REPO:-$REPO}"

TARGET="${1:-release/vds}"
SOURCE="${2:-HEAD}"

command -v pnpm >/dev/null 2>&1 || { echo "make-release: pnpm is required" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "make-release: commit or stash your changes first" >&2; exit 1; }

SOURCE_SHA="$(git rev-parse --short "$SOURCE")"
SOURCE_FILES="$(git ls-tree -r --name-only "$SOURCE" | wc -l)"
echo "make-release: building $TARGET from $SOURCE ($SOURCE_SHA)"
git checkout -q -B "$TARGET" "$SOURCE"

# ---------------------------------------------------------------- deletions
# Development-only scaffolding. Nothing here is imported by the application —
# checked with grep before this list was written, not assumed. Nothing under
# apps/cms/src is removed beyond tests and these scripts: the rest of that
# tree is live, including the Payload admin components wired by string paths
# in payload.config.ts and the collections, which no import graph shows.
drop() { for p in "$@"; do git rm -rq --ignore-unmatch -- "$p" || true; done; }

# Tests, and the scripts that exist only to exercise or seed the app.
git ls-files | grep -E '\.test\.ts$' | while read -r f; do git rm -q -- "$f"; done
drop apps/cms/visual-baselines
drop apps/cms/src/scripts/seed-smoke.ts apps/cms/src/scripts/seed-media-smoke.ts \
     apps/cms/src/scripts/seed-visual.ts apps/cms/src/scripts/seed-preview.ts \
     apps/cms/src/scripts/cleanup-visual.ts apps/cms/src/scripts/is-catalog-empty.ts \
     apps/cms/src/scripts/visual-regression.mjs
git ls-files | grep -E 'apps/cms/src/scripts/.*smoke' | while read -r f; do git rm -q -- "$f"; done

# Local preview and hosted-preview scaffolding.
drop scripts compose.dev.yaml compose.preview.yaml render.yaml .env.preview apps/cms/start-hosted.sh

# Project documentation, design handoff, agent and CI tooling. The one file
# the app actually reads out of docs/ is relocated below, before this runs.
drop docs design_handoff_swiss_bento tools .claude .github CLAUDE.md
drop "Playback Rental - прокат техники.html"

# The legacy root Vite/Supabase app — a different application, the one
# main/prod deploys. Already excluded from the image by .dockerignore; this
# removes it from the branch too.
drop src server supabase public dist index.html components.json eslint.config.js \
     postcss.config.js tailwind.config.ts tsconfig.json tsconfig.app.json \
     tsconfig.node.json vite.config.ts vercel.json bun.lockb package-lock.json \
     ecosystem.config.cjs

# ---------------------------------------------------------- transformations
# 1. styles/prototype.css imports a token sheet that lived in docs/ — the only
#    runtime dependency the app had on that directory. It moves into the
#    package that uses it.
git show "$SOURCE:docs/design-reference/spec/tokens.css" > apps/cms/src/styles/design-tokens.css
git add apps/cms/src/styles/design-tokens.css
perl -0pi -e 's{\@import "(?:\.\./)+docs/design-reference/spec/tokens\.css";}{\@import "./design-tokens.css";}' \
  apps/cms/src/styles/prototype.css
grep -q 'design-tokens.css' apps/cms/src/styles/prototype.css \
  || { echo "make-release: token import rewrite failed" >&2; exit 1; }

# 2. The image therefore no longer needs docs/ copied into it.
perl -0pi -e 's{^# prototype\.css imports docs/.*?^COPY docs docs\n}{}ms' apps/cms/Dockerfile
! grep -q '^COPY docs docs' apps/cms/Dockerfile \
  || { echo "make-release: Dockerfile still copies docs/" >&2; exit 1; }

# 3. The workspace root carried the legacy app's manifest — 50-odd
#    dependencies this application never loads. It becomes a bare workspace
#    root, and the lockfile is regenerated to match.
node -e '
  const fs = require("fs");
  const old = JSON.parse(fs.readFileSync("package.json", "utf8"));
  fs.writeFileSync("package.json", JSON.stringify({
    name: "playback-rental",
    private: true,
    version: old.version ?? "0.0.0",
    type: "module",
    packageManager: old.packageManager,
  }, null, 2) + "\n");
'

# 4. Drop the package scripts whose files this branch no longer has.
node -e '
  const fs = require("fs");
  const p = "apps/cms/package.json";
  const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
  const dead = /^(test|smoke:|visual:|preview:)/;
  pkg.scripts = Object.fromEntries(Object.entries(pkg.scripts).filter(([k]) => !dead.test(k)));
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n");
'

# 5. .dockerignore excluded the legacy app path by path; those paths are gone.
perl -0pi -e 's{^# Legacy root Vite app.*?\n(?:^/\S+\n)+\n}{}ms' .dockerignore

echo "make-release: regenerating the lockfile"
pnpm install --lockfile-only --ignore-scripts >/dev/null

git add -A
git commit -q -m "release: deploy-only tree from $SOURCE_SHA

Generated by scripts/make-release.sh on the development branch. Carries the
application, its migrations, the МойСклад and notification workers, the Docker
image and the compose stack — and nothing that exists only to develop or test
them.

Do not edit this branch by hand: regenerate it from the development branch."
echo "make-release: $TARGET is at $(git rev-parse --short HEAD)"
echo "make-release: $(git ls-files | wc -l) files, down from $SOURCE_FILES"
