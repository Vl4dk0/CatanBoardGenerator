# Deploying the Catan backend

The backend is a single static-ish binary that binds `127.0.0.1:$PORT` and is
reached through nginx at `https://vladimirjancar.sk/catan/api/`. The static Expo
export is served from `/var/www/vladimirjancarsk/catan/` by the vhost's existing
per-project convention (same as kosik).

## 1. Produce the Linux x86_64 binary

The server is Ubuntu x86_64 with **no Docker** and a tight disk. Building on this
Mac (Apple Silicon) means cross-compiling. **Recommended: a static musl binary
via cargo-zigbuild** — nothing to install on the server, just copy one file.

```sh
brew install zig
cargo install cargo-zigbuild
rustup target add x86_64-unknown-linux-musl
cd backend
cargo zigbuild --release --target x86_64-unknown-linux-musl
# -> target/x86_64-unknown-linux-musl/release/catan-backend  (fully static, ~0.5-1 MB)
```

Fallbacks:
- **gnu instead of musl**: `rustup target add x86_64-unknown-linux-gnu` then
  `cargo zigbuild --release --target x86_64-unknown-linux-gnu`. Works too, but
  the binary then depends on the server's glibc; musl avoids that entirely.
- **Build on the server**: install rustup under `/data` and `cargo build
  --release` there. Simplest conceptually, but a Rust toolchain is ~1.5 GB — a
  poor fit for the tight disk. Prefer cross-compiling.

## 2. Install the binary + service

```sh
scp target/x86_64-unknown-linux-musl/release/catan-backend  home:/tmp/catan-backend
# on the server:
sudo install -m 0755 /tmp/catan-backend /usr/local/bin/catan-backend
sudo install -m 0644 catan-backend.service /etc/systemd/system/catan-backend.service
sudo systemctl daemon-reload
sudo systemctl enable --now catan-backend
curl -s http://127.0.0.1:48628/api/healthz    # -> {"status":"ok"}
```

## 3. nginx

Paste `nginx-catan.snippet` into the existing vladimirjancar.sk `:443 server {}`
block, **before** the generic SPA-fallback regex location. Then:

```sh
sudo nginx -t && sudo systemctl reload nginx
curl -s https://vladimirjancar.sk/catan/api/healthz
```

## 4. Deploy the static frontend

```sh
npm run build:web        # EXPO_PUBLIC_API_BASE unset -> bakes "/catan" base
# copy dist/ contents to /var/www/vladimirjancarsk/catan/ (same as other projects)
```

## Local dev

```sh
# terminal 1 — backend
cd backend && cargo run                      # 127.0.0.1:48628

# terminal 2 — web client, pointed at the local backend
EXPO_PUBLIC_API_BASE=http://localhost:48628 npm run web
```

The backend sends `Access-Control-Allow-Origin: *` so the Expo dev server
(different port) can call it directly.
