//! Catan board generator.
//!
//! Faithful port of `src/logic/catanLogic.ts`. The board model, the generation
//! algorithm, the placement rules and the "12% spread" balance constraint match
//! the TypeScript one-for-one so that generated boards are statistically
//! equivalent. The only intentional difference is the source of randomness:
//! lodash `_.sample`/`_.shuffle` become uniform draws from `fastrand`.

use serde::Serialize;
use std::collections::{HashMap, HashSet};

/// Resource kinds. `Any` (`"?"`) only ever appears on generic 3:1 ports, never
/// on a land tile.
#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Resource {
    Wood,
    Brick,
    Sheep,
    Wheat,
    Stone,
    Desert,
    #[serde(rename = "?")]
    Any,
}

/// A land tile. `resource` is always `Some` in a finished board (the centre is
/// `Desert`); `number` is `None` only on the desert. The `Option`s mirror the
/// `ResourceType | null` / `number | null` shape the client type declares.
#[derive(Clone, Debug, Serialize)]
pub struct HexTile {
    pub id: u32,
    pub x: i32,
    pub y: i32,
    pub resource: Option<Resource>,
    pub number: Option<u8>,
}

/// A harbour. `x` values are integers, `y` values are multiples of `HEX_RAD`,
/// exactly as in the TS `initialPortsData`.
#[derive(Clone, Debug, Serialize)]
pub struct Port {
    pub id: u32,
    pub x1: i32,
    pub y1: f64,
    pub x2: i32,
    pub y2: f64,
    pub resource: Resource,
}

#[derive(Clone, Debug, Serialize)]
pub struct GeneratedBoard {
    pub tiles: Vec<HexTile>,
    pub ports: Vec<Port>,
}

/// `HEX_RAD = 2 / sqrt(3)` — identical IEEE-754 double to the JS constant.
fn hex_rad() -> f64 {
    2.0 / (3.0_f64).sqrt()
}

/// The 19 fixed tile positions as `(x, y, id)`. Index equals `id`.
const INITIAL_TILES: [(i32, i32, u32); 19] = [
    (-2, 2, 0),
    (0, 2, 1),
    (2, 2, 2),
    (-3, 1, 3),
    (-1, 1, 4),
    (1, 1, 5),
    (3, 1, 6),
    (-4, 0, 7),
    (-2, 0, 8),
    (0, 0, 9),
    (2, 0, 10),
    (4, 0, 11),
    (-3, -1, 12),
    (-1, -1, 13),
    (1, -1, 14),
    (3, -1, 15),
    (-2, -2, 16),
    (0, -2, 17),
    (2, -2, 18),
];

/// Land-resource multiset placed on the 18 non-desert tiles: 4 sheep, 4 wheat,
/// 4 wood, 3 stone, 3 brick.
const TILES_START: [Resource; 18] = [
    Resource::Sheep,
    Resource::Sheep,
    Resource::Sheep,
    Resource::Sheep,
    Resource::Wheat,
    Resource::Wheat,
    Resource::Wheat,
    Resource::Wheat,
    Resource::Wood,
    Resource::Wood,
    Resource::Wood,
    Resource::Wood,
    Resource::Stone,
    Resource::Stone,
    Resource::Stone,
    Resource::Brick,
    Resource::Brick,
    Resource::Brick,
];

/// The 18 number tokens.
const ROLL_NUMBERS: [u8; 18] = [
    2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
];

/// Tiles adjacent to each port; a resource may not be placed on a tile next to
/// the port that trades it. `99` entries are placeholders for `Any` ports (they
/// never match a land resource) and are kept verbatim from the TS source.
fn port_banned_tiles(port_id: u32) -> &'static [u32] {
    match port_id {
        0 => &[0, 1, 2, 4, 5],
        1 => &[1, 2, 5, 6, 99],
        2 => &[2, 5, 6, 10, 11],
        3 => &[10, 11, 14, 15, 18],
        4 => &[14, 15, 17, 18, 99],
        5 => &[13, 14, 16, 17, 18],
        6 => &[7, 8, 12, 13, 16],
        7 => &[3, 7, 8, 12, 99],
        8 => &[0, 3, 4, 7, 8],
        _ => &[],
    }
}

/// The 9 harbours, with fixed geometry and fixed resources
/// (`listOfPortsStart`, indexed by port id).
pub fn build_ports() -> Vec<Port> {
    let h = hex_rad();
    vec![
        Port { id: 0, x1: -1, y1: 3.5 * h, x2: 0, y2: 4.0 * h, resource: Resource::Wood },
        Port { id: 1, x1: 2, y1: 4.0 * h, x2: 3, y2: 3.5 * h, resource: Resource::Any },
        Port { id: 2, x1: 4, y1: 2.0 * h, x2: 4, y2: 1.0 * h, resource: Resource::Wheat },
        Port { id: 3, x1: 4, y1: -1.0 * h, x2: 4, y2: -2.0 * h, resource: Resource::Stone },
        Port { id: 4, x1: 3, y1: -3.5 * h, x2: 2, y2: -4.0 * h, resource: Resource::Any },
        Port { id: 5, x1: 0, y1: -4.0 * h, x2: -1, y2: -3.5 * h, resource: Resource::Sheep },
        Port { id: 6, x1: -3, y1: -2.5 * h, x2: -4, y2: -2.0 * h, resource: Resource::Any },
        Port { id: 7, x1: -5, y1: -0.5 * h, x2: -5, y2: 0.5 * h, resource: Resource::Any },
        Port { id: 8, x1: -4, y1: 2.0 * h, x2: -3, y2: 2.5 * h, resource: Resource::Brick },
    ]
}

/// Dice-pip weight of a number token, in 36ths (probability of the sum on 2d6).
fn dice_probability(number: u8) -> u32 {
    match number {
        2 | 12 => 1,
        3 | 11 => 2,
        4 | 10 => 3,
        5 | 9 => 4,
        6 | 8 => 5,
        _ => 0,
    }
}

/// Per-resource "drop probability": for each resource, the sum over its *unique*
/// number tokens of the dice weight, expressed as a percentage of 36. Mirrors
/// `calculateResourceDropProbability`.
pub fn resource_drop_probability(tiles: &[HexTile]) -> HashMap<Resource, f64> {
    let mut numbers: HashMap<Resource, HashSet<u8>> = HashMap::new();
    for tile in tiles {
        if let (Some(res), Some(num)) = (tile.resource, tile.number) {
            if res != Resource::Desert {
                numbers.entry(res).or_default().insert(num);
            }
        }
    }

    let mut out = HashMap::new();
    for (res, nums) in numbers {
        let total: u32 = nums.iter().map(|&n| dice_probability(n)).sum();
        out.insert(res, (total as f64 / 36.0) * 100.0);
    }
    out
}

/// The 12% constraint: the spread (max − min) of the per-resource drop
/// probabilities must not exceed 12 percentage points.
fn is_resource_balanced_by_spread(tiles: &[HexTile]) -> bool {
    let probs = resource_drop_probability(tiles);
    if probs.is_empty() {
        return false;
    }
    let values: Vec<f64> = probs.values().copied().collect();
    let max = values.iter().copied().fold(f64::MIN, f64::max);
    let min = values.iter().copied().fold(f64::MAX, f64::min);
    (max - min) <= 12.0
}

/// The six axial neighbour offsets used by the TS `getNeighbors`.
const NEIGHBOR_OFFSETS: [(i32, i32); 6] =
    [(2, 0), (1, 1), (-1, 1), (-2, 0), (-1, -1), (1, -1)];

/// Precompute, for each tile index, the indices of its neighbours.
fn compute_neighbors() -> Vec<Vec<usize>> {
    let mut by_coord: HashMap<(i32, i32), usize> = HashMap::new();
    for (i, &(x, y, _)) in INITIAL_TILES.iter().enumerate() {
        by_coord.insert((x, y), i);
    }
    INITIAL_TILES
        .iter()
        .map(|&(x, y, _)| {
            NEIGHBOR_OFFSETS
                .iter()
                .filter_map(|&(dx, dy)| by_coord.get(&(x + dx, y + dy)).copied())
                .collect()
        })
        .collect()
}

fn build_tiles(resources: &[Resource], numbers: &[Option<u8>]) -> Vec<HexTile> {
    INITIAL_TILES
        .iter()
        .enumerate()
        .map(|(i, &(x, y, id))| HexTile {
            id,
            x,
            y,
            resource: Some(resources[i]),
            number: numbers[i],
        })
        .collect()
}

// Retry budgets — identical to the TS constants.
const MAX_TOTAL_GENERATION_ATTEMPTS: u32 = 10_000;
const MAX_TILE_PHASE_ATTEMPTS: u32 = 500;
const MAX_TILE_TRIES_PER_SPOT: u32 = 100;
const MAX_NUMBER_PHASE_ATTEMPTS: u32 = 500;

/// Generate one valid board using a fresh RNG. Returns `None` if no valid board
/// is found within the attempt budget (in practice this never happens).
pub fn generate_board() -> Option<GeneratedBoard> {
    let mut rng = fastrand::Rng::new();
    generate_board_with(&mut rng)
}

/// Generate one valid board with a caller-supplied RNG (used for seeded tests).
pub fn generate_board_with(rng: &mut fastrand::Rng) -> Option<GeneratedBoard> {
    let ports = build_ports();
    let neighbors = compute_neighbors();

    for _ in 0..MAX_TOTAL_GENERATION_ATTEMPTS {
        // --- Phase 1: resource placement ---
        let placed = place_resources(rng, &ports, &neighbors);
        let placed = match placed {
            Some(p) => p,
            None => continue,
        };

        // --- Phase 2: number placement ---
        if let Some(numbers) = place_numbers(rng, &placed, &neighbors) {
            let tiles = build_tiles(&placed, &numbers);
            return Some(GeneratedBoard { tiles, ports });
        }
    }

    None
}

fn place_resources(
    rng: &mut fastrand::Rng,
    ports: &[Port],
    neighbors: &[Vec<usize>],
) -> Option<Vec<Resource>> {
    for _ in 0..MAX_TILE_PHASE_ATTEMPTS {
        let mut resources: Vec<Option<Resource>> = vec![None; 19];
        let mut available: Vec<Resource> = TILES_START.to_vec();
        let mut failed = false;

        for i in 0..19 {
            let (x, y, id) = INITIAL_TILES[i];
            if x == 0 && y == 0 {
                resources[i] = Some(Resource::Desert);
                continue;
            }

            // Draw a resource for this spot, rejecting ones banned by an
            // adjacent matching port. `possible` is a multiset copy, so more
            // plentiful resources are proportionally more likely (matches
            // `_.sample` over `availableTiles`).
            let mut possible: Vec<Resource> = available.clone();
            let mut chosen: Option<Resource> = None;
            let mut tries = 0;
            while chosen.is_none() && tries < MAX_TILE_TRIES_PER_SPOT && !possible.is_empty() {
                tries += 1;
                let cand = possible[rng.usize(..possible.len())];
                let banned = ports
                    .iter()
                    .any(|p| p.resource == cand && port_banned_tiles(p.id).contains(&id));
                if banned {
                    possible.retain(|&r| r != cand);
                } else {
                    chosen = Some(cand);
                }
            }

            match chosen {
                None => {
                    failed = true;
                    break;
                }
                Some(c) => {
                    resources[i] = Some(c);
                    if let Some(pos) = available.iter().position(|&r| r == c) {
                        available.remove(pos);
                    } else {
                        failed = true;
                        break;
                    }
                }
            }
        }

        if failed {
            continue;
        }

        // Rule: no two adjacent tiles share a resource.
        let adjacency_violation = (0..19).any(|i| {
            let r = resources[i].unwrap();
            r != Resource::Desert && neighbors[i].iter().any(|&j| resources[j] == Some(r))
        });
        if adjacency_violation {
            continue;
        }

        return Some(resources.into_iter().map(|r| r.unwrap()).collect());
    }

    None
}

fn place_numbers(
    rng: &mut fastrand::Rng,
    resources: &[Resource],
    neighbors: &[Vec<usize>],
) -> Option<Vec<Option<u8>>> {
    for _ in 0..MAX_NUMBER_PHASE_ATTEMPTS {
        let mut numbers: Vec<Option<u8>> = vec![None; 19];
        let mut available: Vec<u8> = ROLL_NUMBERS.to_vec();
        rng.shuffle(&mut available);
        let mut failed = false;

        for i in 0..19 {
            if resources[i] != Resource::Desert {
                match available.pop() {
                    Some(n) => numbers[i] = Some(n),
                    None => {
                        failed = true;
                        break;
                    }
                }
            }
        }
        if failed {
            continue;
        }

        // Rule: no two adjacent tiles share a number.
        let same_number_adjacent = (0..19).any(|i| {
            numbers[i].is_some_and(|n| neighbors[i].iter().any(|&j| numbers[j] == Some(n)))
        });
        if same_number_adjacent {
            continue;
        }

        // Rule: no duplicate (resource, number) pair.
        let mut seen: HashSet<(Resource, u8)> = HashSet::new();
        let duplicate_pair = (0..19).any(|i| {
            resources[i] != Resource::Desert
                && numbers[i].is_some_and(|n| !seen.insert((resources[i], n)))
        });
        if duplicate_pair {
            continue;
        }

        // Rule: no two adjacent 6/8 "red" tiles.
        let red_adjacent = (0..19).any(|i| {
            matches!(numbers[i], Some(6) | Some(8))
                && neighbors[i]
                    .iter()
                    .any(|&j| matches!(numbers[j], Some(6) | Some(8)))
        });
        if red_adjacent {
            continue;
        }

        // Rule: 12% drop-probability spread.
        let tiles = build_tiles(resources, &numbers);
        if !is_resource_balanced_by_spread(&tiles) {
            continue;
        }

        return Some(numbers);
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_board_valid(board: &GeneratedBoard) {
        assert_eq!(board.tiles.len(), 19, "must have 19 tiles");
        assert_eq!(board.ports.len(), 9, "must have 9 ports");

        // Exactly one desert, and it sits at the centre (0, 0).
        let deserts: Vec<&HexTile> = board
            .tiles
            .iter()
            .filter(|t| t.resource == Some(Resource::Desert))
            .collect();
        assert_eq!(deserts.len(), 1, "exactly one desert");
        assert_eq!((deserts[0].x, deserts[0].y), (0, 0), "desert at centre");
        assert!(deserts[0].number.is_none(), "desert has no number");

        // Resource multiset.
        let mut counts: HashMap<Resource, usize> = HashMap::new();
        for t in &board.tiles {
            *counts.entry(t.resource.unwrap()).or_default() += 1;
        }
        assert_eq!(counts[&Resource::Sheep], 4);
        assert_eq!(counts[&Resource::Wheat], 4);
        assert_eq!(counts[&Resource::Wood], 4);
        assert_eq!(counts[&Resource::Stone], 3);
        assert_eq!(counts[&Resource::Brick], 3);
        assert_eq!(counts[&Resource::Desert], 1);

        // Number multiset on non-desert tiles equals ROLL_NUMBERS.
        let mut nums: Vec<u8> = board
            .tiles
            .iter()
            .filter(|t| t.resource != Some(Resource::Desert))
            .map(|t| t.number.expect("non-desert tile has a number"))
            .collect();
        nums.sort_unstable();
        let mut expected = ROLL_NUMBERS.to_vec();
        expected.sort_unstable();
        assert_eq!(nums, expected, "number tokens match the standard bag");

        let neighbors = compute_neighbors();

        // No adjacent same resource; no adjacent same number; no adjacent 6/8.
        for i in 0..19 {
            let ti = &board.tiles[i];
            for &j in &neighbors[i] {
                let tj = &board.tiles[j];
                if ti.resource != Some(Resource::Desert) {
                    assert_ne!(ti.resource, tj.resource, "adjacent same resource");
                }
                if let (Some(a), Some(b)) = (ti.number, tj.number) {
                    assert_ne!(a, b, "adjacent same number");
                    let a_red = a == 6 || a == 8;
                    let b_red = b == 6 || b == 8;
                    assert!(!(a_red && b_red), "adjacent 6/8 tiles");
                }
            }
        }

        // No duplicate (resource, number) pair.
        let mut pairs: HashSet<(Resource, u8)> = HashSet::new();
        for t in &board.tiles {
            if t.resource != Some(Resource::Desert) {
                let pair = (t.resource.unwrap(), t.number.unwrap());
                assert!(pairs.insert(pair), "duplicate resource-number pair {pair:?}");
            }
        }

        // 12% balance constraint holds.
        assert!(
            is_resource_balanced_by_spread(&board.tiles),
            "drop-probability spread exceeds 12"
        );

        // Port ban: no land tile carries the resource of an adjacent same-resource port.
        for port in &board.ports {
            if port.resource == Resource::Any {
                continue;
            }
            for &banned_id in port_banned_tiles(port.id) {
                if let Some(tile) = board.tiles.iter().find(|t| t.id == banned_id) {
                    assert_ne!(
                        tile.resource,
                        Some(port.resource),
                        "port {} resource {:?} sits on banned tile {}",
                        port.id,
                        port.resource,
                        banned_id
                    );
                }
            }
        }
    }

    #[test]
    fn generates_many_valid_boards() {
        // Generation is intentionally expensive: the 12% balance constraint is
        // tight (it forces the per-resource dice-weight spread to <= 4), so each
        // board costs ~150-200ms even optimized. Sweep a lot in release, but
        // keep an unoptimized `cargo test` (debug) tolerable.
        let iterations = if cfg!(debug_assertions) { 8 } else { 200 };
        for _ in 0..iterations {
            let board = generate_board().expect("generation should succeed");
            assert_board_valid(&board);
        }
    }

    #[test]
    fn seeded_generation_is_reproducible() {
        let mut a = fastrand::Rng::with_seed(0xC0FFEE);
        let mut b = fastrand::Rng::with_seed(0xC0FFEE);
        let board_a = generate_board_with(&mut a).unwrap();
        let board_b = generate_board_with(&mut b).unwrap();
        let json_a = serde_json::to_string(&board_a).unwrap();
        let json_b = serde_json::to_string(&board_b).unwrap();
        assert_eq!(json_a, json_b, "same seed must yield the same board");
        assert_board_valid(&board_a);
    }

    #[test]
    fn dice_probability_matches_2d6() {
        assert_eq!(dice_probability(2), 1);
        assert_eq!(dice_probability(12), 1);
        assert_eq!(dice_probability(6), 5);
        assert_eq!(dice_probability(8), 5);
        assert_eq!(dice_probability(7), 0);
    }

    #[test]
    fn ports_have_expected_resources() {
        let ports = build_ports();
        let resources: Vec<Resource> = ports.iter().map(|p| p.resource).collect();
        assert_eq!(
            resources,
            vec![
                Resource::Wood,
                Resource::Any,
                Resource::Wheat,
                Resource::Stone,
                Resource::Any,
                Resource::Sheep,
                Resource::Any,
                Resource::Any,
                Resource::Brick,
            ]
        );
    }

    #[test]
    fn resource_serializes_to_expected_strings() {
        assert_eq!(serde_json::to_string(&Resource::Wood).unwrap(), "\"wood\"");
        assert_eq!(serde_json::to_string(&Resource::Any).unwrap(), "\"?\"");
        assert_eq!(
            serde_json::to_string(&Resource::Desert).unwrap(),
            "\"desert\""
        );
    }
}
