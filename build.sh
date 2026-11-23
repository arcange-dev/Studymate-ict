#!/bin/sh
# Regenerate the deploy bundle in dist/ from StudyMate-ICT/.
#
# The bundle is the app shell only: documentation and screenshots are excluded,
# because the deployed site does not need them. dist/ is committed (not ignored)
# so hosting can serve it with no build step, and it is what
# sites/site.manifest.json (assetsDirectory: ../dist) and the root
# wrangler.jsonc (assets.directory: ./dist) both point at. Re-run this and
# commit dist/ whenever StudyMate-ICT/ changes.
set -eu

cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist
rsync -a --exclude 'assets/screenshots' --exclude '*.md' StudyMate-ICT/ dist/

echo "Built dist/ ($(find dist -type f | wc -l | tr -d ' ') files)"
