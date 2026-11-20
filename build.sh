#!/bin/sh
# Regenerate the deploy bundle in dist/ from StudyMate-ICT/.
#
# The bundle is the app shell only: documentation and screenshots are excluded,
# because the deployed site does not need them. dist/ is git-ignored build
# output and is uploaded with sites/site.manifest.json (assetsDirectory: ../dist).
set -eu

cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist
rsync -a --exclude 'assets/screenshots' --exclude '*.md' StudyMate-ICT/ dist/

echo "Built dist/ ($(find dist -type f | wc -l | tr -d ' ') files)"
