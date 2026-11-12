#!/usr/bin/env bash
# Puts together the public website from one copy of the repository.
#   assemble.sh <folder holding the copy> <folder to write the site to> [preview]
# Rebuilds the pages from the data, and leaves the working files (briefs, logs, inbox,
# data and tools) out. With "preview" the result is marked so search
# engines ignore it, because it is a trial copy and not the live site.
set -euo pipefail
SRC="$(cd "$1" && pwd)"
mkdir -p "$2"
OUT="$(cd "$2" && pwd)"
(cd "$SRC" && python3 tools/build.py)
rsync -a "$SRC/" "$OUT/" \
  --exclude '/_site' \
  --exclude '/.git' \
  --exclude '/.github' \
  --exclude '/.gitignore' \
  --exclude '/CLAUDE.md' \
  --exclude '/VOICE.md' \
  --exclude '/AGENT-LOG.md' \
  --exclude '/CONTENT-CALENDAR.md' \
  --exclude '/README.md' \
  --exclude '/image-slots.json' \
  --exclude '/inbox' \
  --exclude '/preview' \
  --exclude '/tools' \
  --exclude '/data'

if [ "${3:-}" = "preview" ]; then
  rm -f "$OUT/CNAME" "$OUT/robots.txt" "$OUT/sitemap.xml"
  find "$OUT" -name '*.html' -exec sed -i '0,/<head>/s//<head><meta name="robots" content="noindex, nofollow">/' {} +
fi
