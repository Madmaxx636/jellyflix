#!/usr/bin/env bash
# Runs the native app against the made-up Jellyfin server and lets it check itself (qml/AutoTest.qml).
# No window and no sound: the app draws with the software renderer and mpv decodes without a picture.
# Usage: native/tests/selftest.sh [path to the jellyflix program]
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
app="${1:-$here/../build/jellyflix}"
port="${PORT:-18411}"
home="$(mktemp -d)"
media="$(cd "$root" && node -e "import('./tests/e2e/lib/clip.mjs').then(m => console.log(m.ensureClip()))")"
[ -n "$media" ] || { echo "ffmpeg is needed to make the test clip"; exit 2; }

# real JPEG pictures (not the made-up server's SVG ones): a package missing its JPEG support must not pass
art="$home/art"; mkdir -p "$art"
for kind in Primary Backdrop Thumb; do ffmpeg -loglevel error -y -f lavfi -i "color=c=0xe8a317:s=400x600" -frames:v 1 "$art/$kind.jpg"; done
artdir="$art"; command -v cygpath >/dev/null 2>&1 && artdir="$(cygpath -m "$art")"
PORT="$port" MOCK_JPEG="$artdir" MOCK_HOLIDAYS=1 MOCK_MODE=directplay MOCK_MEDIA="$media" node "$root/tests/e2e/lib/mock-jellyfin.mjs" >/dev/null 2>&1 &
mock=$!
trap 'kill $mock 2>/dev/null; rm -rf "$home"' EXIT
sleep 1.5

# macOS has no `timeout`, so the time limit is kept here.
out="$home/out.log"
# Linux: give the app a private desktop message bus, so the media-key check talks to a real one.
bus=""; if [ "$(uname)" = "Linux" ] && command -v dbus-run-session >/dev/null 2>&1; then bus="dbus-run-session --"; fi
( JELLYFLIX_HEADLESS=1 JELLYFLIX_UPDATE_DRYRUN=1 JELLYFLIX_UPDATE_URL="http://127.0.0.1:$port/updates/latest" JELLYFLIX_TEST_SERVER="http://127.0.0.1:$port" QT_QPA_PLATFORM=offscreen HOME="$home" $bus "$app" >"$out" 2>&1; echo $? >"$home/status" ) &
runner=$!
for _ in $(seq 1 120); do
  kill -0 "$runner" 2>/dev/null || break
  sleep 1
done
if kill -0 "$runner" 2>/dev/null; then kill "$runner" 2>/dev/null; pkill -P "$runner" 2>/dev/null; echo "FAIL  the app did not finish in two minutes"; echo 124 >"$home/status"; fi
wait "$runner" 2>/dev/null || true
grep -E "^qml: (PASS|FAIL|=====)|Error|error" "$out" | sed 's/^qml: //' || true
if [ "$(cat "$home/status" 2>/dev/null || echo 1)" != "0" ]; then echo "--- the app's own output ---"; tail -n 25 "$out"; fi
exit "$(cat "$home/status" 2>/dev/null || echo 1)"
