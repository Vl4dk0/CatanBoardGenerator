import _ from "lodash";

// --- Interfaces, Types, Initial Data, portBannedTiles, Lists (remain the same) ---
export type ResourceType =
  | "wood"
  | "brick"
  | "sheep"
  | "wheat"
  | "stone"
  | "desert"
  | "?";

export interface HexTile {
  id: number;
  x: number;
  y: number;
  resource: ResourceType | null;
  number: number | null;
}

export interface Port {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  resource: ResourceType;
}

export interface GeneratedBoard {
  tiles: HexTile[];
  ports: Port[];
}

const HEX_RAD = 2 / Math.sqrt(3);

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
  { x: 0, y: 0, id: 9 },
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

const initialPortsData: Omit<Port, "resource">[] = [
  { x1: -1, y1: 3.5 * HEX_RAD, x2: 0, y2: 4 * HEX_RAD, id: 0 },
  { x1: 2, y1: 4 * HEX_RAD, x2: 3, y2: 3.5 * HEX_RAD, id: 1 },
  { x1: 4, y1: 2 * HEX_RAD, x2: 4, y2: HEX_RAD, id: 2 },
  { x1: 4, y1: -HEX_RAD, x2: 4, y2: -2 * HEX_RAD, id: 3 },
  { x1: 3, y1: -3.5 * HEX_RAD, x2: 2, y2: -4 * HEX_RAD, id: 4 },
  { x1: 0, y1: -4 * HEX_RAD, x2: -1, y2: -3.5 * HEX_RAD, id: 5 },
  { x1: -3, y1: -2.5 * HEX_RAD, x2: -4, y2: -2 * HEX_RAD, id: 6 },
  { x1: -5, y1: -0.5 * HEX_RAD, x2: -5, y2: 0.5 * HEX_RAD, id: 7 },
  { x1: -4, y1: 2 * HEX_RAD, x2: -3, y2: 2.5 * HEX_RAD, id: 8 },
];

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

// --- Helper Functions (getNeighbors remains the same) ---
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
    if (neighbor) neighbors.push(neighbor);
  }
  return neighbors;
}

// --- Generation Logic ---

// **NEW**: Define a high attempt limit
const MAX_TOTAL_GENERATION_ATTEMPTS = 10000; // Allow many attempts

// **MODIFIED**: Function can now return null again if limit is reached
export function generateCatanBoard(
  defaultPortLocations = true,
  portCheck = true,
): GeneratedBoard | null {
  // Return type is nullable again
  let totalAttempts = 0; // Track overall attempts

  // Loop until a complete board is generated OR the limit is hit
  while (totalAttempts < MAX_TOTAL_GENERATION_ATTEMPTS) {
    totalAttempts++;
    let tilePlacementSuccess = false;
    let currentTilesAttempt: HexTile[] | null = null; // Store result of tile phase

    // --- Tile Placement Inner Loop ---
    let tilePlacementAttempts = 0;
    const MAX_TILE_PHASE_ATTEMPTS = 500; // Limit attempts *within* tile phase per overall attempt
    while (
      !tilePlacementSuccess &&
      tilePlacementAttempts < MAX_TILE_PHASE_ATTEMPTS
    ) {
      tilePlacementAttempts++;
      let currentTiles: HexTile[] = initialTilesData.map((t) => ({
        ...t,
        resource: null,
        number: null,
      }));
      let availableTiles = [...listOfTilesStart];
      let tilePlacementFailedThisAttempt = false;
      let portRuleTimeoutThisAttempt = false;

      // Assign ports (do this inside the loop if ports aren't default/fixed)
      // If ports are fixed, this can stay outside the main while loop. Assuming fixed for now.
      let finalPorts: Port[] = initialPortsData.map((p) => ({
        ...p,
        resource: "?" as ResourceType,
      }));
      let availablePortResources = [...listOfPortsStart];
      if (defaultPortLocations) {
        finalPorts.forEach((port) => {
          port.resource = listOfPortsStart[port.id];
        });
      } else {
        availablePortResources = _.shuffle(availablePortResources);
        finalPorts.forEach((port) => {
          port.resource = availablePortResources.pop()!;
        });
      }
      // Port assignment done

      for (const tile of currentTiles) {
        if (tile.x === 0 && tile.y === 0) {
          tile.resource = "desert";
        } else {
          // ... (inner logic for picking a single tile, including MAX_TILE_TRIES_PER_SPOT) ...
          let possibleTiles = [...availableTiles];
          let chosenTile: ResourceType | null = null;
          let tileFits = false;
          let tryCount = 0;
          const MAX_TILE_TRIES_PER_SPOT = 100;

          while (
            !tileFits &&
            tryCount < MAX_TILE_TRIES_PER_SPOT &&
            possibleTiles.length > 0
          ) {
            tryCount++;
            const candidateTile = _.sample(possibleTiles)!;
            let isBannedByPort = false;
            if (portCheck) {
              for (const port of finalPorts) {
                if (
                  port.resource === candidateTile &&
                  portBannedTiles[port.id]?.includes(tile.id)
                ) {
                  isBannedByPort = true;
                  break;
                }
              }
            }
            if (!isBannedByPort) {
              chosenTile = candidateTile;
              tileFits = true;
            } else {
              possibleTiles = possibleTiles.filter((t) => t !== candidateTile);
            }
          }
          if (!tileFits) {
            portRuleTimeoutThisAttempt = true;
            break;
          }

          tile.resource = chosenTile;
          const indexToRemove = availableTiles.findIndex(
            (t) => t === chosenTile,
          );
          if (indexToRemove > -1) {
            availableTiles.splice(indexToRemove, 1);
          } else {
            tilePlacementFailedThisAttempt = true;
            break;
          }
        }
      } // End for loop assigning tiles

      if (portRuleTimeoutThisAttempt || tilePlacementFailedThisAttempt)
        continue; // Try tile placement again

      // --- Tile Balancing Rules Check ---
      let rulesViolated = false;
      // ... (stone/brick check) ...
      for (const tile of currentTiles) {
        if (
          (tile.resource === "stone" || tile.resource === "brick") &&
          getNeighbors(tile, currentTiles).some(
            (n) => n.resource === tile.resource,
          )
        ) {
          rulesViolated = true;
          break;
        }
      }
      if (rulesViolated) continue;
      // ... (wheat/wood/sheep cluster check) ...
      for (const tile of currentTiles) {
        if (["wheat", "wood", "sheep"].includes(tile.resource!)) {
          const neighbors = getNeighbors(tile, currentTiles);
          const sameResourceNeighbors = neighbors.filter(
            (n) => n.resource === tile.resource,
          );
          for (const neighbor of sameResourceNeighbors) {
            if (
              getNeighbors(neighbor, currentTiles).some(
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
      if (rulesViolated) continue;

      // Tile placement successful for this attempt
      tilePlacementSuccess = true;
      currentTilesAttempt = currentTiles; // Store successful tile layout
      // console.log(`Tile placement successful after ${tilePlacementAttempts} attempts.`);
    } // End while tile placement inner loop

    // If tile placement failed after its attempts, restart the *outer* loop
    if (!tilePlacementSuccess || !currentTilesAttempt) {
      // console.log(`Tile phase failed within overall attempt ${totalAttempts}. Retrying.`);
      continue;
    }

    // --- Number Placement Loop ---
    let numberPlacementSuccess = false;
    let finalTiles: HexTile[] | null = null;
    let numberPlacementAttempts = 0;
    const MAX_NUMBER_PHASE_ATTEMPTS = 500; // Limit attempts *within* number phase

    while (
      !numberPlacementSuccess &&
      numberPlacementAttempts < MAX_NUMBER_PHASE_ATTEMPTS
    ) {
      numberPlacementAttempts++;
      let currentTilesWithNumbers = _.cloneDeep(currentTilesAttempt); // Use successful tile layout
      let availableNumbers = _.shuffle([...listOfRollNumbersStart]);
      let numberPlacementFailedThisAttempt = false;

      for (const tile of currentTilesWithNumbers) {
        if (tile.resource !== "desert") {
          if (availableNumbers.length === 0) {
            numberPlacementFailedThisAttempt = true;
            break;
          }
          tile.number = availableNumbers.pop()!;
        }
      }
      if (numberPlacementFailedThisAttempt) continue; // Try number placement again

      // --- Number Balancing Rules Check ---
      let rulesViolated = false;
      // ... (adjacent same number check) ...
      for (const tile of currentTilesWithNumbers) {
        if (
          tile.number !== null &&
          getNeighbors(tile, currentTilesWithNumbers).some(
            (n) => n.number === tile.number,
          )
        ) {
          rulesViolated = true;
          break;
        }
      }
      if (rulesViolated) continue;
      // ... (same number on same resource check) ...
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
      if (rulesViolated) continue;
      // ... (6 and 8 on same resource check) ...
      const resourceHighRolls: Record<string, number[]> = {};
      for (const tile of currentTilesWithNumbers) {
        if (
          tile.resource !== "desert" &&
          (tile.number === 6 || tile.number === 8)
        ) {
          if (!resourceHighRolls[tile.resource!])
            resourceHighRolls[tile.resource!] = [];
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
      if (rulesViolated) continue;
      // ... (adjacent 6 or 8 check) ...
      for (const tile of currentTilesWithNumbers) {
        if (
          (tile.number === 6 || tile.number === 8) &&
          getNeighbors(tile, currentTilesWithNumbers).some(
            (n) => n.number === 6 || n.number === 8,
          )
        ) {
          rulesViolated = true;
          break;
        }
      }
      if (rulesViolated) continue;

      // Number placement successful
      numberPlacementSuccess = true;
      finalTiles = currentTilesWithNumbers; // Store final board
      // console.log(`Number placement successful after ${numberPlacementAttempts} attempts.`);
    } // End while number placement inner loop

    // If number placement succeeded, we have a final board! Return it.
    if (numberPlacementSuccess && finalTiles) {
      console.log(
        `Board generated successfully within total attempt ${totalAttempts}.`,
      );
      // Need to return ports as well
      let finalPortsResult: Port[] = initialPortsData.map((p) => ({
        ...p,
        resource: "?" as ResourceType,
      }));
      // Re-assign ports based on settings (ensure consistency if ports were assigned earlier)
      let portsForReturn = [...listOfPortsStart];
      if (defaultPortLocations) {
        finalPortsResult.forEach((port) => {
          port.resource = listOfPortsStart[port.id];
        });
      } else {
        // If ports were randomized, we should ideally use the same randomization as used
        // during the tile placement checks for this successful attempt.
        // This requires structuring port assignment differently if non-default is used.
        // For simplicity now, re-randomizing if needed, but this isn't ideal.
        portsForReturn = _.shuffle(portsForReturn);
        finalPortsResult.forEach((port) => {
          port.resource = portsForReturn.pop()!;
        });
      }
      return { tiles: finalTiles, ports: finalPortsResult };
    }

    // If number placement failed after its attempts, the outer loop (totalAttempts) will continue.
  } // End while totalAttempts loop

  // If we exit the while loop, it means MAX_TOTAL_GENERATION_ATTEMPTS was reached
  console.warn(
    `Failed to generate a valid board after ${MAX_TOTAL_GENERATION_ATTEMPTS} attempts.`,
  );
  return null; // Indicate failure
}
