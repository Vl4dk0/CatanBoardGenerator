#!/usr/bin/env bash
# Deploy the Catan board generator to Vladko's home box over the `home` ssh alias.
#
# Model (mirrors kosik): build the STATIC FRONTEND locally, build the RUST BACKEND ON THE
# BOX (native x86_64 toolchain — no cross-compile), then place both and restart the systemd
# service. Served as the subpath https://vladimirjancar.sk/catan/ (existing domain +
# certificate; no DNS record, no new cert). See README.md for the one-time root setup this
# script assumes is already in place.
#
# Simpler than kosik: the backend has no TLS/OpenSSL deps and no database, so there is no
# libssl-dev prerequisite, no .env, and no first-start migrations.
set -euo pipefail

# --- locate the repo root (this script lives in <repo>/backend/deploy) ------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"

REMOTE="home"                                   # ssh alias (vladko-home.duckdns.org:2222)
REMOTE_ROOT="/data/catan"                        # runtime tree (never ~, which auto-wipes 2h)
REMOTE_WEB="/var/www/vladimirjancarsk/catan"     # static docroot (vladko-owned; no sudo)
HEALTH_URL="https://vladimirjancar.sk/catan/api/healthz"

# --- 0. preflight: required local tooling ----------------------------------------------
# The backend is built on the box, so locally we only need node/npm (frontend) + rsync/ssh.
missing=0
for tool in node npm rsync ssh; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "  missing $tool" >&2
    missing=1
  fi
done
if [ "$missing" -ne 0 ]; then
  echo >&2
  echo "Install the missing tool(s) above, then re-run ./backend/deploy/deploy.sh" >&2
  exit 1
fi

# --- 1. frontend build (static Expo web export -> dist/) --------------------------------
# The /catan base comes from app.json (experiments.baseUrl); a clean `npm ci` keeps the
# build reproducible from the committed lockfile. EXPO_PUBLIC_API_BASE is explicitly cleared
# so the client bakes the default "/catan" base (same-origin API via nginx), never a dev URL.
echo "==> building frontend (npm ci && npm run build:web)"
env -u EXPO_PUBLIC_API_BASE bash -c 'npm ci && npm run build:web'

# --- 2. backend build ON THE BOX (native release build) --------------------------------
# Ship the source (minus target/) up, then compile there with the box's own Rust so the
# binary links against the box's glibc — no cross-compile toolchain on the dev machine.
echo "==> syncing backend source to $REMOTE:$REMOTE_ROOT/src/"
rsync -az --delete --exclude target/ backend/ "$REMOTE:$REMOTE_ROOT/src/"

# Build via a login shell so cargo is on PATH; fall back to the well-known install location
# if the non-interactive login profile does not export it.
echo "==> building backend on $REMOTE (cargo build --release)"
ssh "$REMOTE" 'bash -lc "cd '"$REMOTE_ROOT"'/src && if command -v cargo >/dev/null 2>&1; then cargo build --release; else ~/.cargo/bin/cargo build --release; fi"'

# Copy to a temp path then rename into place: an atomic rename avoids ETXTBSY ("text file
# busy") that a plain overwrite would hit while the current binary is still running.
echo "==> installing binary -> $REMOTE_ROOT/bin/catan-backend"
ssh "$REMOTE" 'cp '"$REMOTE_ROOT"'/src/target/release/catan-backend '"$REMOTE_ROOT"'/bin/catan-backend.new && mv '"$REMOTE_ROOT"'/bin/catan-backend.new '"$REMOTE_ROOT"'/bin/catan-backend'

# --- 3. sync static frontend -> nginx docroot ------------------------------------------
# Trailing slash on the source syncs the *contents* of dist/; --delete prunes assets from
# previous builds so no stale hashed files linger. The docroot is vladko-owned -> no sudo.
echo "==> syncing web assets to $REMOTE:$REMOTE_WEB/"
rsync -av --delete dist/ "$REMOTE:$REMOTE_WEB/"

# --- 4. restart the service ------------------------------------------------------------
# A scoped sudoers rule (/etc/sudoers.d/catan, see README.md) grants passwordless restart of
# just this service, so `sudo -n` (never prompt) works without any stored password.
echo "==> restarting catan-backend.service"
ssh "$REMOTE" 'sudo -n systemctl restart catan-backend.service'

# --- 5. health check (gates success) ---------------------------------------------------
# A Type=simple service returns from `systemctl restart` before it binds 127.0.0.1:48628, so
# the first curl can transiently fail. Retry up to $HEALTH_ATTEMPTS times, 1s apart, and
# succeed on the first 2xx (`curl -f` fails on >=400). Do NOT use `curl ... && echo`: under
# `set -e`, a failing command on the left of `&&` is exempt from errexit, so a down service
# would still exit 0.
echo "==> health check: $HEALTH_URL"
HEALTH_ATTEMPTS=10
for attempt in $(seq 1 "$HEALTH_ATTEMPTS"); do
  if curl -fsS "$HEALTH_URL"; then
    echo
    echo "Deployed. https://vladimirjancar.sk/catan/"
    exit 0
  fi
  echo "  attempt $attempt/$HEALTH_ATTEMPTS: not healthy yet; retrying in 1s..." >&2
  sleep 1
done
echo >&2
echo "health check FAILED: $HEALTH_URL did not return 2xx after $HEALTH_ATTEMPTS attempts" >&2
echo "The deploy is NOT healthy. Inspect: ssh $REMOTE 'sudo journalctl -u catan-backend.service -n 50'" >&2
exit 1
