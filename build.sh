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

# Stamp the service-worker cache with a hash of the app shell, so a browser that
# still runs an old worker cannot serve stale HTML/CSS/JS after a build. dist/
# is what hosting serves, so only the built copy is stamped; the source sw.js
# keeps its readable fallback version.
STAMP=$(find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.webmanifest' -o -name '*.svg' \) ! -name 'sw.js' -exec sha256sum {} + \
  | LC_ALL=C sort -k2 | sha256sum | cut -c1-10)
sed -i.bak "s/studymate-ict-v[0-9A-Za-z.-]*/studymate-ict-$STAMP/" dist/sw.js
rm -f dist/sw.js.bak

echo "Built dist/ ($(find dist -type f | wc -l | tr -d ' ') files, cache studymate-ict-$STAMP)"
