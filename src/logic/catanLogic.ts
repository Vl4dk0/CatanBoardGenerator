import _ from "lodash";

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

const ports: Port[] = initialPortsData.map((p) => ({
  ...p,
  resource: "?" as ResourceType,
}));
ports.forEach((port) => {
  port.resource = listOfPortsStart[port.id];
});

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

// high values means we give more space to even bad seeds
// altough we do not give up too soon on good seeds

// TODO: optimize value
const MAX_TOTAL_GENERATION_ATTEMPTS = 10000;

// TODO: optimize value
const MAX_TILE_PHASE_ATTEMPTS = 500;

// TODO: optimize value
const MAX_TILE_TRIES_PER_SPOT = 100;

// TODO: optimize value
const MAX_NUMBER_PHASE_ATTEMPTS = 500;

export function generateCatanBoard(portCheck = true): GeneratedBoard | null {
  let totalAttempts = 0;

  while (totalAttempts < MAX_TOTAL_GENERATION_ATTEMPTS) {
    totalAttempts++;
    let tilePlacementSuccess = false;
    let currentTilesAttempt: HexTile[] | null = null;

    // tile placement
    let tilePlacementAttempts = 0;
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

      for (const tile of currentTiles) {
        if (tile.x === 0 && tile.y === 0) {
          tile.resource = "desert";
        } else {
          let possibleTiles = [...availableTiles];
          let chosenTile: ResourceType | null = null;
          let tileFits = false;
          let tryCount = 0;

          while (
            !tileFits &&
            tryCount < MAX_TILE_TRIES_PER_SPOT &&
            possibleTiles.length > 0
          ) {
            tryCount++;
            const candidateTile = _.sample(possibleTiles)!;

            // Resource shouldnt be next to its port
            let isBannedByPort = false;
            if (portCheck) {
              for (const port of ports) {
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
      }

      // try again
      if (portRuleTimeoutThisAttempt || tilePlacementFailedThisAttempt)
        continue;

      // Check rules
      let rulesViolated = false;

      // stones cannot be next to each other, same with bricks
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

      // is there a triplet of wheat, wood or sheep?
      for (const tile of currentTiles) {
        if (["wheat", "wood", "sheep"].includes(tile.resource!)) {
          const neighbors = getNeighbors(tile, currentTiles);
          const sameResourceNeighbors = neighbors.filter(
            (other) => other.resource === tile.resource,
          );

          if (sameResourceNeighbors.length > 1) {
            rulesViolated = true;
            break;
          }
        }
      }
      if (rulesViolated) continue;

      // there should be at most 2 neighbours of the same resource
      // if there are 2, they cannot be the same resource
      let doubles = 0;
      for (const tile of currentTiles) {
        const neighbors = getNeighbors(tile, currentTiles);
        const sameResourceNeighbors = neighbors.filter(
          (other) => other.resource === tile.resource,
        );

        doubles += sameResourceNeighbors.length;
      }
      doubles /= 2; // each double is counted twice
      if (doubles > 2) {
        rulesViolated = true;
      }
      if (doubles === 2) {
        const firstTile = currentTiles.find(
          (t) => t.resource === currentTiles[0].resource,
        );
        const secondTile = currentTiles.find(
          (t) => t.resource === currentTiles[1].resource,
        );
        if (
          firstTile &&
          secondTile &&
          firstTile.resource === secondTile.resource
        ) {
          rulesViolated = true;
        }
      }
      if (rulesViolated) continue;

      tilePlacementSuccess = true;
      currentTilesAttempt = currentTiles;
      // success
    }

    // try again
    if (!tilePlacementSuccess || !currentTilesAttempt) {
      continue;
    }

    // Number placements
    let numberPlacementSuccess = false;
    let finalTiles: HexTile[] | null = null;
    let numberPlacementAttempts = 0;
    while (
      !numberPlacementSuccess &&
      numberPlacementAttempts < MAX_NUMBER_PHASE_ATTEMPTS
    ) {
      numberPlacementAttempts++;
      let currentTilesWithNumbers = _.cloneDeep(currentTilesAttempt);
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

      // try again
      if (numberPlacementFailedThisAttempt) continue;

      // Check rules for numbers
      let rulesViolated = false;

      // no same number on adjacent tiles
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

      // no same resource-number pairs
      // no 6 and 8 on the same tile-type
      const resourceNumberPairs = new Set<string>();
      for (const tile of currentTilesWithNumbers) {
        if (tile.resource !== "desert" && tile.number !== null) {
          let number =
            tile.number === 6 || tile.number === 8 ? 100 : tile.number;

          const pair = `${tile.resource}-${number}`;
          if (resourceNumberPairs.has(pair)) {
            rulesViolated = true;
            break;
          }
          resourceNumberPairs.add(pair);
        }
      }
      if (rulesViolated) continue;

      // No 6 and 8 on adjacent tiles
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

      // 2 and 12 should be on the same resource
      const two = currentTilesWithNumbers.find((t) => t.number === 2);
      const twelve = currentTilesWithNumbers.find((t) => t.number === 12);
      if (two && twelve) {
        if (two.resource === twelve.resource) {
          rulesViolated = true;
        }
      }
      if (rulesViolated) continue;

      numberPlacementSuccess = true;
      finalTiles = currentTilesWithNumbers;
      // success
    }

    if (numberPlacementSuccess && finalTiles) {
      return { tiles: finalTiles, ports: ports };
    }

    // try again
  }

  console.warn(
    `Failed to generate a valid board after ${MAX_TOTAL_GENERATION_ATTEMPTS} attempts.`,
  );

  // indicate failure
  return null;
}
