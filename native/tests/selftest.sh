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

PORT="$port" MOCK_MODE=directplay MOCK_MEDIA="$media" node "$root/tests/e2e/lib/mock-jellyfin.mjs" >/dev/null 2>&1 &
mock=$!
trap 'kill $mock 2>/dev/null; rm -rf "$home"' EXIT
sleep 1.5

# macOS has no `timeout`, so the time limit is kept here.
out="$home/out.log"
( JELLYFLIX_HEADLESS=1 JELLYFLIX_TEST_SERVER="http://127.0.0.1:$port" QT_QPA_PLATFORM=offscreen HOME="$home" "$app" >"$out" 2>&1; echo $? >"$home/status" ) &
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
