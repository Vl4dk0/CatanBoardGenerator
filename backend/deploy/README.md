# Deployment — Catan board generator

The app is served as a **subpath of the existing domain**:
**`https://vladimirjancar.sk/catan/`**.

- **No new DNS record and no new certificate.** `/catan` reuses the already-live
  `vladimirjancar.sk` vhost and its Let's Encrypt certificate.
- **Backend** — the Rust binary `catan-backend` runs as systemd service
  `catan-backend.service`, binds **`127.0.0.1:48628`** (loopback only), and serves a pure
  API (`/api/board`, `/api/healthz`). It serves **no** static files, has **no database**,
  and has **no TLS/OpenSSL** dependency.
- **Frontend** — the static Expo web export is served directly by nginx from
  `/var/www/vladimirjancarsk/catan/` via the vhost's existing per-project convention.
- **nginx** strips the `/catan` prefix and reverse-proxies `/catan/api/` → `/api/` on the
  backend. The backend code is unchanged and never sees `/catan`.
- **The backend is built ON THE BOX** (native x86_64 Rust; the box has rustup/cargo under
  `~/.cargo`). No cross-compile toolchain on the dev machine.
- **All runtime state lives under `/data/catan/`** (`bin/catan-backend`, `src/`) — the root
  disk is tight and `~` is auto-wiped every 2h; `/data` has plenty of space.

The box is the `home` ssh alias (`vladko-home.duckdns.org:2222`, user `vladko`). Everything
below the one-time section is a plain `./backend/deploy/deploy.sh` from the dev machine.

---

## One-time setup

Files referenced (`catan-backend.service`, `nginx-catan.snippet`) live in this `deploy/`
directory. Run the steps in order.

### 1. Install the scoped sudoers rule (root on the box)

Deploys restart `catan-backend.service` via `sudo -n` (never prompts, never stores a
password). That requires this one-time rule at `/etc/sudoers.d/catan`, mode `0440`:

```bash
ssh home
printf 'vladko ALL=(root) NOPASSWD: /usr/bin/systemctl restart catan-backend.service, /usr/bin/systemctl start catan-backend.service, /usr/bin/systemctl stop catan-backend.service\n' | sudo tee /etc/sudoers.d/catan && sudo chmod 0440 /etc/sudoers.d/catan && sudo visudo -cf /etc/sudoers.d/catan
```

`visudo -cf` must print `/etc/sudoers.d/catan: parsed OK`. It is scoped to only those three
commands on `catan-backend.service` and is reversible by deleting the file.

### 2. Create the runtime tree + docroot (root on the box)

```bash
ssh home
sudo mkdir -p /data/catan/{bin,src}
sudo chown -R vladko:vladko /data/catan
sudo mkdir -p /var/www/vladimirjancarsk/catan
sudo chown -R vladko:vladko /var/www/vladimirjancarsk/catan
```

(No `data/` dir and no `.env` — the backend has no database and reads only `PORT` /
`POOL_SIZE`, which are set inline in the unit.)

### 3. Install the systemd unit (root on the box)

```bash
scp backend/deploy/catan-backend.service home:/tmp/catan-backend.service
ssh home
sudo install -m 644 /tmp/catan-backend.service /etc/systemd/system/catan-backend.service
rm /tmp/catan-backend.service
sudo systemctl daemon-reload
sudo systemctl enable catan-backend.service    # start-on-boot; the FIRST deploy starts it
```

Do NOT start it yet — the binary is placed by the first deploy.

### 4. Wire up nginx (root on the box)

Paste the contents of `backend/deploy/nginx-catan.snippet` INTO the existing
`vladimirjancar.sk` :443 `server { }` block in
`/etc/nginx/sites-available/vladimirjancar.sk`, **before** the generic
`location ~ ^/(?<proj>[^/]+)/` regex. The `^~` prefix on the `/catan/api/` location is
mandatory (else that SPA-fallback regex hijacks the API and returns `index.html`).

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://vladimirjancar.sk       # BEFORE: expect 200
sudo nano /etc/nginx/sites-available/vladimirjancar.sk                     # paste the snippet
sudo nginx -t && sudo systemctl reload nginx
curl -sS -o /dev/null -w '%{http_code}\n' https://vladimirjancar.sk       # AFTER: expect 200
```

If `nginx -t` fails, do NOT reload — fix the paste first.

### 5. First deploy (from the dev machine)

```bash
./backend/deploy/deploy.sh
```

This builds the frontend, builds the backend on the box, installs `bin/catan-backend`, syncs
the static app to the docroot, and restarts `catan-backend.service` (which now starts it).
Then verify:

```bash
curl -fsS https://vladimirjancar.sk/catan/api/healthz     # -> {"status":"ok"}
ssh home 'systemctl is-enabled catan-backend.service'     # -> enabled
```

Open `https://vladimirjancar.sk/catan/` in a browser to confirm the app loads.

---

## Routine deploy (from the dev machine)

```bash
./backend/deploy/deploy.sh
```

The script:
1. checks local tooling (`node`, `npm`, `rsync`, `ssh`);
2. builds the frontend with `npm ci && npm run build:web` (base `/catan` from app.json;
   `EXPO_PUBLIC_API_BASE` is cleared so the same-origin default is baked in);
3. rsyncs `backend/` (minus `target/`) to `home:/data/catan/src/` and runs
   `cargo build --release` **on the box**;
4. installs the built binary as `/data/catan/bin/catan-backend` (atomic rename → no ETXTBSY);
5. `rsync -av --delete` the static export (`dist/`) to `home:/var/www/vladimirjancarsk/catan/`;
6. restarts `catan-backend.service` over ssh via `sudo -n systemctl restart` (passwordless,
   gated by the scoped sudoers rule above);
7. curls the health endpoint (retries; gates success).

**Dev-machine prerequisites (one-time):** an ssh host alias `home` in `~/.ssh/config`, and
the scoped sudoers rule (step 1) installed on the box.

---

## Local dev

```bash
# terminal 1 — backend
cd backend && cargo run                      # 127.0.0.1:48628

# terminal 2 — web client, pointed at the local backend
EXPO_PUBLIC_API_BASE=http://localhost:48628 npm run web
```

The backend sends `Access-Control-Allow-Origin: *` so the Expo dev server (different port)
can call it directly.

---

## Health check & operations

```bash
curl -fsS https://vladimirjancar.sk/catan/api/healthz     # -> {"status":"ok"}
```

On the box:

```bash
sudo systemctl status catan-backend.service       # is it up?
sudo journalctl -u catan-backend.service -f       # tail logs
sudo systemctl restart catan-backend.service      # manual restart
ssh home 'curl -fsS http://127.0.0.1:48628/api/healthz'   # bypass nginx (backend direct)
```
