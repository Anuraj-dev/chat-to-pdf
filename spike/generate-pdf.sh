#!/usr/bin/env bash
# Render spike/sample.html to spike/browser-output.pdf via headless Chrome.
# Throwaway spike tool for chat-to-pdf issue #2 (browser phase).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IN="$DIR/sample.html"
OUT="$DIR/browser-output.pdf"

# Locate a Chromium-family binary.
CHROME=""
for c in google-chrome google-chrome-stable chromium-browser chromium chrome; do
  if command -v "$c" >/dev/null 2>&1; then CHROME="$c"; break; fi
done
if [ -z "$CHROME" ] && command -v flatpak >/dev/null 2>&1; then
  if flatpak info com.google.Chrome >/dev/null 2>&1; then
    CHROME="flatpak run com.google.Chrome"
  elif flatpak info org.chromium.Chromium >/dev/null 2>&1; then
    CHROME="flatpak run org.chromium.Chromium"
  fi
fi
if [ -z "$CHROME" ]; then
  echo "ERROR: no Chrome/Chromium binary found." >&2
  exit 1
fi
echo "Using: $CHROME"

# --no-pdf-header-footer omits the default date/URL chrome; A4 is defined by
# @page in the HTML. --print-to-pdf-no-header is the older alias.
$CHROME \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf="$OUT" \
  "file://$IN"

echo "Wrote: $OUT"
