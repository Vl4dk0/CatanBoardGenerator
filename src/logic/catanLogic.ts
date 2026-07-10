// Board generation now lives in the Rust backend (see backend/). This module
// keeps only the shared board model and the client-side stats helpers used by
// StatsMenu to describe a board it received from the API.

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

function getDiceProbability(number: number): number {
  const probabilities: Record<number, number> = {
    2: 1,
    12: 1,
    3: 2,
    11: 2,
    4: 3,
    10: 3,
    5: 4,
    9: 4,
    6: 5,
    8: 5,
  };
  return probabilities[number] || 0;
}

export function calculateResourceBalance(
  tiles: HexTile[],
): Map<ResourceType, number> {
  const resourceStats = new Map<
    ResourceType,
    { totalProb: number; count: number }
  >();

  for (const tile of tiles) {
    if (tile.resource !== "desert" && tile.number !== null) {
      const stats = resourceStats.get(tile.resource!) || {
        totalProb: 0,
        count: 0,
      };
      stats.totalProb += getDiceProbability(tile.number);
      stats.count += 1;
      resourceStats.set(tile.resource!, stats);
    }
  }

  // Return average probability per tile for each resource
  const averages = new Map<ResourceType, number>();
  resourceStats.forEach((stats, resource) => {
    averages.set(resource, stats.totalProb / stats.count);
  });
  return averages;
}

export function calculateResourceDropProbability(
  tiles: HexTile[],
): Map<ResourceType, number> {
  const resourceNumbers = new Map<ResourceType, Set<number>>();

  // Collect unique numbers for each resource
  for (const tile of tiles) {
    if (tile.resource !== "desert" && tile.number !== null) {
      if (!resourceNumbers.has(tile.resource!)) {
        resourceNumbers.set(tile.resource!, new Set());
      }
      resourceNumbers.get(tile.resource!)!.add(tile.number);
    }
  }

  // Calculate probability for each resource
  const probabilities = new Map<ResourceType, number>();
  resourceNumbers.forEach((numbers, resource) => {
    let totalProbability = 0;
    numbers.forEach((num) => {
      totalProbability += getDiceProbability(num);
    });
    // Convert to percentage (totalProbability is in 36ths)
    const percentage = (totalProbability / 36) * 100;
    probabilities.set(resource, percentage);
  });

  return probabilities;
}
