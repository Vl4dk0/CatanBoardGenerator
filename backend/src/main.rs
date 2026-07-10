//! Tiny HTTP service for Catan boards.
//!
//! A background producer keeps a bounded pool of precomputed boards ready, so
//! `GET /api/board` responds instantly. Binds `127.0.0.1:$PORT` and is meant to
//! sit behind an nginx reverse proxy.
//!
//! Env:
//!   PORT             (default 48628)  TCP port on 127.0.0.1
//!   POOL_SIZE        (default 8)      number of boards kept warm
//!   HANDLER_THREADS  (default 4)      concurrent request workers

use std::env;
use std::process;
use std::sync::mpsc::{sync_channel, Receiver};
use std::sync::{Arc, Mutex};
use std::thread;

use catan_backend::{generate_board, GeneratedBoard};
use tiny_http::{Header, Method, Request, Response, Server};

fn env_var<T: std::str::FromStr>(key: &str, default: T) -> T {
    env::var(key)
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}

fn header(name: &str, value: &str) -> Header {
    Header::from_bytes(name.as_bytes(), value.as_bytes())
        .expect("static header is valid")
}

fn main() {
    let port: u16 = env_var("PORT", 48628);
    // Boards are ~1 KB each, so a generous warm buffer is cheap and hides the
    // ~150-200ms per-board generation cost from bursty clicking.
    let pool_size: usize = env_var("POOL_SIZE", 16);
    let handler_threads: usize = env_var("HANDLER_THREADS", 4);

    // Bounded pool: the producer blocks on `send` once `pool_size` boards are
    // buffered, so at most `pool_size` (+1 in flight) sit ready at any time.
    let (tx, rx) = sync_channel::<GeneratedBoard>(pool_size);
    let rx = Arc::new(Mutex::new(rx));

    thread::spawn(move || loop {
        // `generate_board` returns None only if it exhausts its (very large)
        // attempt budget; just try again in that practically-impossible case.
        if let Some(board) = generate_board() {
            if tx.send(board).is_err() {
                break; // all consumers gone
            }
        }
    });

    let server = match Server::http(("127.0.0.1", port)) {
        Ok(s) => Arc::new(s),
        Err(e) => {
            eprintln!("catan-backend: failed to bind 127.0.0.1:{port}: {e}");
            process::exit(1);
        }
    };

    eprintln!(
        "catan-backend: listening on http://127.0.0.1:{port} (pool={pool_size}, threads={handler_threads})"
    );

    let mut workers = Vec::with_capacity(handler_threads);
    for _ in 0..handler_threads {
        let server = Arc::clone(&server);
        let rx = Arc::clone(&rx);
        workers.push(thread::spawn(move || {
            for request in server.incoming_requests() {
                handle(request, &rx);
            }
        }));
    }

    for w in workers {
        let _ = w.join();
    }
}

fn handle(request: Request, rx: &Arc<Mutex<Receiver<GeneratedBoard>>>) {
    let is_get = *request.method() == Method::Get;
    // Trim any query string.
    let path = request.url().split('?').next().unwrap_or("").to_string();

    match (is_get, path.as_str()) {
        (true, "/api/board") => respond_board(request, rx),
        (true, "/api/healthz") => {
            let _ = request.respond(json_response("{\"status\":\"ok\"}"));
        }
        _ => {
            let _ = request.respond(
                Response::from_string("not found")
                    .with_status_code(404)
                    .with_header(header("Access-Control-Allow-Origin", "*")),
            );
        }
    }
}

fn respond_board(request: Request, rx: &Arc<Mutex<Receiver<GeneratedBoard>>>) {
    // Take a warm board if one is ready; otherwise generate on demand so a
    // momentarily-drained pool never blocks or errors.
    let board = {
        let guard = rx.lock().expect("pool mutex poisoned");
        guard.try_recv().ok()
    }
    .or_else(generate_board);

    match board {
        Some(board) => match serde_json::to_string(&board) {
            Ok(body) => {
                let _ = request.respond(json_response(&body));
            }
            Err(_) => {
                let _ = request.respond(
                    Response::from_string("{\"error\":\"serialization failed\"}")
                        .with_status_code(500)
                        .with_header(header("Content-Type", "application/json"))
                        .with_header(header("Access-Control-Allow-Origin", "*")),
                );
            }
        },
        None => {
            let _ = request.respond(
                Response::from_string("{\"error\":\"generation failed\"}")
                    .with_status_code(503)
                    .with_header(header("Content-Type", "application/json"))
                    .with_header(header("Access-Control-Allow-Origin", "*")),
            );
        }
    }
}

fn json_response(body: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    Response::from_string(body)
        .with_header(header("Content-Type", "application/json"))
        // Same-origin in production (nginx proxy); permissive so the Expo web
        // dev server on another port can call it directly.
        .with_header(header("Access-Control-Allow-Origin", "*"))
}
