import type { GeneratedBoard } from "../logic/catanLogic";

// Where the Rust backend lives.
// - Production: unset -> "/catan", so requests go to "/catan/api/board" on the
//   same origin, which nginx proxies (prefix-stripped) to the local service.
// - Local dev: set EXPO_PUBLIC_API_BASE=http://localhost:48628 to hit `cargo run`.
const API_BASE = (process.env.EXPO_PUBLIC_API_BASE ?? "/catan").replace(
  /\/+$/,
  "",
);

export const BOARD_ENDPOINT = `${API_BASE}/api/board`;

export async function fetchBoard(signal?: AbortSignal): Promise<GeneratedBoard> {
  const response = await fetch(BOARD_ENDPOINT, { signal });
  if (!response.ok) {
    throw new Error(`Board request failed (${response.status})`);
  }
  return (await response.json()) as GeneratedBoard;
}
