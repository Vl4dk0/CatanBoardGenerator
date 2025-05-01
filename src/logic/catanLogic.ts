import _ from "lodash"; // We'll use lodash for shuffling, sampling etc.

// --- Interfaces and Types ---

export type ResourceType =
  | "wood"
  | "brick"
  | "sheep"
  | "wheat"
  | "stone"
  | "desert"
  | "?"; // For ports

export interface HexTile {
  id: number;
  x: number; // Doubled coordinate x
  y: number; // Doubled coordinate y
  resource: ResourceType | null;
  number: number | null;
}

export interface Port {
  id: number;
  x1: number; // Pier 1 x
  y1: number; // Pier 1 y
  x2: number; // Pier 2 x
  y2: number; // Pier 2 y
  resource: ResourceType;
}

export interface GeneratedBoard {
  tiles: HexTile[];
  ports: Port[];
}

// --- Constants (Translated from Python) ---

const HEX_RAD = 2 / Math.sqrt(3); // Not directly used in logic, but useful for rendering later

// Initial tile configuration (using doubled coordinates)
const initialTilesData: Omit<HexTile, "resource" | "number">[] = [
  { x: -2, y: 2, id: 0 },
  { x: 0, y: 2, id: 1 },
  { x: 2, y: 2, id: 2 },
  { x: -3, y: 1, id: 3 },
  { x: -1, y: 1, id: 4 },
  { x: 1, y: 1, id: 5 },
  { x: 3, y: 1, id: 6 },
  { x: -4, y: 0, id: 7 },
  { x: -2, y: 0, id: 8 },
  { x: 0, y: 0, id: 9 }, // Center tile (desert)
  { x: 2, y: 0, id: 10 },
  { x: 4, y: 0, id: 11 },
  { x: -3, y: -1, id: 12 },
  { x: -1, y: -1, id: 13 },
  { x: 1, y: -1, id: 14 },
  { x: 3, y: -1, id: 15 },
  { x: -2, y: -2, id: 16 },
  { x: 0, y: -2, id: 17 },
  { x: 2, y: -2, id: 18 },
];

// Initial port configuration
const initialPortsData: Omit<Port, "resource">[] = [
  { x1: -1, y1: 3.5 * HEX_RAD, x2: 0, y2: 4 * HEX_RAD, id: 0 },
  { x1: 2, y1: 4 * HEX_RAD, x2: 3, y2: 3.5 * HEX_RAD, id: 1 },
  { x1: 4, y1: 2 * HEX_RAD, x2: 4, y2: HEX_RAD, id: 2 },
  { x1: 4, y1: -HEX_RAD, x2: 4, y2: -2 * HEX_RAD, id: 3 },
  { x1: 3, y1: -3.5 * HEX_RAD, x2: 2, y2: -4 * HEX_RAD, id: 4 },
  { x1: 0, y1: -4 * HEX_RAD, x2: -1, y2: -3.5 * HEX_RAD, id: 5 },
  { x1: -3, y1: -2.5 * HEX_RAD, x2: -4, y2: -2 * HEX_RAD, id: 6 }, // Python code had y1=-3, y2=-2.5? Adjusted based on pattern. Double check original intent.
  { x1: -5, y1: -0.5 * HEX_RAD, x2: -5, y2: 0.5 * HEX_RAD, id: 7 },
  { x1: -4, y1: 2 * HEX_RAD, x2: -3, y2: 2.5 * HEX_RAD, id: 8 },
];

// Port ID -> Banned Tile IDs mapping
// Using 99 as placeholder instead of 20 for clarity
const portBannedTiles: Record<number, number[]> = {
  0: [0, 1, 2, 4, 5],
  1: [1, 2, 5, 6, 99],
  2: [2, 5, 6, 10, 11],
  3: [10, 11, 14, 15, 18],
  4: [14, 15, 17, 18, 99],
  5: [13, 14, 16, 17, 18],
  6: [7, 8, 12, 13, 16],
  7: [3, 7, 8, 12, 99],
  8: [0, 3, 4, 7, 8],
};

const listOfPortsStart: ResourceType[] = [
  "wood",
  "?",
  "wheat",
  "stone",
  "?",
  "sheep",
  "?",
  "?",
  "brick",
];

const listOfTilesStart: ResourceType[] = [
  "sheep",
  "sheep",
  "sheep",
  "sheep",
  "wheat",
  "wheat",
  "wheat",
  "wheat",
  "wood",
  "wood",
  "wood",
  "wood",
  "stone",
  "stone",
  "stone",
  "brick",
  "brick",
  "brick",
];

const listOfRollNumbersStart: number[] = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
];

// --- Helper Functions ---

// Find neighbors based on the doubled coordinate system
function getNeighbors(tile: HexTile, allTiles: HexTile[]): HexTile[] {
  const neighbors: HexTile[] = [];
  const neighborCoords = [
    { dx: 2, dy: 0 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: -2, dy: 0 },
    { dx: -1, dy: -1 },
    { dx: 1, dy: -1 },
  ];

  for (const nc of neighborCoords) {
    const neighbor = allTiles.find(
      (t) => t.x === tile.x + nc.dx && t.y === tile.y + nc.dy,
    );
    if (neighbor) {
      neighbors.push(neighbor);
    }
  }
  return neighbors;
}

// --- Generation Logic ---

export function generateCatanBoard(
  defaultPortLocations = true,
  portCheck = true,
): GeneratedBoard | null {
  let tilePlacementAttempts = 0;
  let numberPlacementAttempts = 0;
  const MAX_ATTEMPTS = 500; // Prevent infinite loops

  let finalTiles: HexTile[] = [];
  let finalPorts: Port[] = [];

  // --- Port Assignment ---
  let currentPorts = initialPortsData.map((p) => ({
    ...p,
    resource: "?" as ResourceType,
  }));
  let availablePortResources = [...listOfPortsStart];

  if (defaultPortLocations) {
    currentPorts.forEach((port) => {
      port.resource = listOfPortsStart[port.id];
    });
  } else {
    availablePortResources = _.shuffle(availablePortResources);
    currentPorts.forEach((port) => {
      port.resource = availablePortResources.pop()!;
    });
  }
  finalPorts = currentPorts; // Ports are fixed now

  // --- Tile Placement Loop ---
  let tilePlacementSuccess = false;
  while (!tilePlacementSuccess && tilePlacementAttempts < MAX_ATTEMPTS) {
    tilePlacementAttempts++;
    let currentTiles: HexTile[] = initialTilesData.map((t) => ({
      ...t,
      resource: null,
      number: null,
    }));
    let availableTiles = [...listOfTilesStart];
    let tilePlacementFailed = false;
    let portRuleTimeout = false;

    for (const tile of currentTiles) {
      if (tile.x === 0 && tile.y === 0) {
        tile.resource = "desert";
      } else {
        let possibleTiles = [...availableTiles];
        let chosenTile: ResourceType | null = null;
        let tileFits = false;
        let tryCount = 0;
        const MAX_TILE_TRIES = 100; // Timeout for finding a suitable tile for one spot

        while (
          !tileFits &&
          tryCount < MAX_TILE_TRIES &&
          possibleTiles.length > 0
        ) {
          tryCount++;
          const candidateTile = _.sample(possibleTiles)!; // Get a random candidate
          let isBannedByPort = false;

          if (portCheck) {
            for (const port of finalPorts) {
              // If port type matches candidate tile type
              if (port.resource === candidateTile) {
                // Check if this tile ID is banned for this port
                if (portBannedTiles[port.id]?.includes(tile.id)) {
                  isBannedByPort = true;
                  break; // Banned by this port, no need to check others
                }
              }
            }
          }

          if (!isBannedByPort) {
            chosenTile = candidateTile;
            tileFits = true;
          } else {
            // Remove the candidate from possibilities for this spot if banned
            possibleTiles = possibleTiles.filter((t) => t !== candidateTile);
          }
        } // End while finding suitable tile for one spot

        if (!tileFits) {
          // Could not find a suitable tile for this spot respecting port rules
          portRuleTimeout = true;
          break; // Exit the loop for this attempt
        }

        tile.resource = chosenTile;
        // Remove the chosen tile from the main available list
        const indexToRemove = availableTiles.findIndex((t) => t === chosenTile);
        if (indexToRemove > -1) {
          availableTiles.splice(indexToRemove, 1);
        } else {
          // Should not happen if logic is correct
          console.error("Error: Tried to remove a tile that wasn't available.");
          tilePlacementFailed = true;
          break;
        }
      }
    } // End for loop assigning tiles

    if (portRuleTimeout) {
      // console.log(`Tile attempt ${tilePlacementAttempts}: Port rule timeout`);
      continue; // Restart tile placement
    }
    if (tilePlacementFailed) {
      // console.log(`Tile attempt ${tilePlacementAttempts}: Logic error`);
      continue; // Restart tile placement
    }

    // --- Tile Balancing Rules Check ---
    let rulesViolated = false;

    // Rule: No two 'stone' or 'brick' adjacent
    for (const tile of currentTiles) {
      if (tile.resource === "stone" || tile.resource === "brick") {
        const neighbors = getNeighbors(tile, currentTiles);
        if (neighbors.some((n) => n.resource === tile.resource)) {
          rulesViolated = true;
          break;
        }
      }
    }
    if (rulesViolated) {
      // console.log(`Tile attempt ${tilePlacementAttempts}: Adjacent stone/brick fail`);
      continue;
    }

    // Rule: No three 'wheat', 'wood', or 'sheep' forming a cluster
    for (const tile of currentTiles) {
      if (["wheat", "wood", "sheep"].includes(tile.resource!)) {
        const neighbors = getNeighbors(tile, currentTiles);
        const sameResourceNeighbors = neighbors.filter(
          (n) => n.resource === tile.resource,
        );

        for (const neighbor of sameResourceNeighbors) {
          const neighborsOfNeighbor = getNeighbors(neighbor, currentTiles);
          if (
            neighborsOfNeighbor.some(
              (non) => non.id !== tile.id && non.resource === tile.resource,
            )
          ) {
            rulesViolated = true;
            break;
          }
        }
        if (rulesViolated) break;
      }
    }
    if (rulesViolated) {
      // console.log(`Tile attempt ${tilePlacementAttempts}: Resource cluster fail`);
      continue;
    }

    // If we reached here, tile placement was successful for this attempt
    tilePlacementSuccess = true;
    finalTiles = currentTiles;
    // console.log(`Tile placement successful after ${tilePlacementAttempts} attempts.`);
  } // End while tile placement loop

  if (!tilePlacementSuccess) {
    console.error("Failed to place tiles after maximum attempts.");
    return null; // Indicate failure
  }

  // --- Number Placement Loop ---
  let numberPlacementSuccess = false;
  while (!numberPlacementSuccess && numberPlacementAttempts < MAX_ATTEMPTS) {
    numberPlacementAttempts++;
    let currentTilesWithNumbers = _.cloneDeep(finalTiles); // Work on a copy
    let availableNumbers = [...listOfRollNumbersStart];
    availableNumbers = _.shuffle(availableNumbers);
    let numberPlacementFailed = false;

    // Assign numbers randomly first
    for (const tile of currentTilesWithNumbers) {
      if (tile.resource !== "desert") {
        if (availableNumbers.length === 0) {
          console.error("Ran out of numbers to assign!");
          numberPlacementFailed = true;
          break;
        }
        tile.number = availableNumbers.pop()!;
      }
    }
    if (numberPlacementFailed) continue; // Restart number placement

    // --- Number Balancing Rules Check ---
    let rulesViolated = false;

    // Rule: No two identical numbers adjacent
    for (const tile of currentTilesWithNumbers) {
      if (tile.number !== null) {
        const neighbors = getNeighbors(tile, currentTilesWithNumbers);
        if (neighbors.some((n) => n.number === tile.number)) {
          rulesViolated = true;
          break;
        }
      }
    }
    if (rulesViolated) {
      // console.log(`Number attempt ${numberPlacementAttempts}: Adjacent same number fail`);
      continue;
    }

    // Rule: No two identical numbers on the same resource type
    const resourceNumberPairs = new Set<string>();
    for (const tile of currentTilesWithNumbers) {
      if (tile.resource !== "desert" && tile.number !== null) {
        const pair = `${tile.resource}-${tile.number}`;
        if (resourceNumberPairs.has(pair)) {
          rulesViolated = true;
          break;
        }
        resourceNumberPairs.add(pair);
      }
    }
    if (rulesViolated) {
      // console.log(`Number attempt ${numberPlacementAttempts}: Same number on same resource fail`);
      continue;
    }

    // Rule: No 6 and 8 on the same resource type
    const resourceHighRolls: Record<string, number[]> = {};
    for (const tile of currentTilesWithNumbers) {
      if (
        tile.resource !== "desert" &&
        (tile.number === 6 || tile.number === 8)
      ) {
        if (!resourceHighRolls[tile.resource!]) {
          resourceHighRolls[tile.resource!] = [];
        }
        resourceHighRolls[tile.resource!].push(tile.number!);
        if (
          resourceHighRolls[tile.resource!].includes(6) &&
          resourceHighRolls[tile.resource!].includes(8)
        ) {
          rulesViolated = true;
          break;
        }
      }
    }
    if (rulesViolated) {
      // console.log(`Number attempt ${numberPlacementAttempts}: 6 and 8 on same resource fail`);
      continue;
    }

    // Rule: No 6 or 8 adjacent
    for (const tile of currentTilesWithNumbers) {
      if (tile.number === 6 || tile.number === 8) {
        const neighbors = getNeighbors(tile, currentTilesWithNumbers);
        if (neighbors.some((n) => n.number === 6 || n.number === 8)) {
          rulesViolated = true;
          break;
        }
      }
    }
    if (rulesViolated) {
      // console.log(`Number attempt ${numberPlacementAttempts}: Adjacent 6/8 fail`);
      continue;
    }

    // If we reached here, number placement was successful
    numberPlacementSuccess = true;
    finalTiles = currentTilesWithNumbers; // Commit the numbers
    // console.log(`Number placement successful after ${numberPlacementAttempts} attempts.`);
  } // End while number placement loop

  if (!numberPlacementSuccess) {
    console.error("Failed to place numbers after maximum attempts.");
    // Optionally, you could return the board with only tiles placed,
    // or null to indicate complete failure.
    return null;
  }

  console.log(
    `Board generated. Tile fails: ${
      tilePlacementAttempts - 1
    }, Number fails: ${numberPlacementAttempts - 1}`,
  );

  return { tiles: finalTiles, ports: finalPorts };
}
