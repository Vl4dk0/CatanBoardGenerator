// src/constants.ts
import type { ResourceType } from "./logic/catanLogic"; // Adjust path if logic file is elsewhere

export const resourceColors: Record<ResourceType, string> = {
  wood: "#023020", // Dark Green
  brick: "#B22222", // Firebrick Red
  sheep: "#90EE90", // Light Green
  wheat: "#FFD700", // Gold (Yellow)
  stone: "#808080", // Gray
  desert: "#F5DEB3", // Wheat (color name, looks like sand)
  "?": "#696969", // Dim Gray for unknown/generic port
};

// Define colors for numbers, especially highlighting 6 and 8
export const numberColors: Record<number, string> = {
  2: "black",
  3: "black",
  4: "black",
  5: "black",
  6: "red", // Highlight 6
  8: "red", // Highlight 8
  9: "black",
  10: "black",
  11: "black",
  12: "black",
};

// Simple mapping for port resource text labels
export const portResourceText: Partial<Record<ResourceType, string>> = {
  wood: "W",
  brick: "B",
  sheep: "S",
  wheat: "Wh",
  stone: "St",
  "?": "3:1", // Indicate 3:1 trade for generic ports
};

// --- SVG Rendering Configuration ---
export const HEX_SVG_RADIUS = 40; // Increased from 28 (adjust as needed)
export const PORT_ELEMENT_BASE_SIZE = HEX_SVG_RADIUS * 0.5; // Recalculates based on new radius

export const VIEWBOX_WIDTH = 500;
export const VIEWBOX_HEIGHT = 500;
export const BOARD_CENTER_X = VIEWBOX_WIDTH / 2;
export const BOARD_CENTER_Y = VIEWBOX_HEIGHT / 2;
// Keep scale factor for positioning
export const PYTHON_PLOT_RANGE = 14; // from -7 to 7 in original plot
export const SCALE_FACTOR = VIEWBOX_WIDTH / PYTHON_PLOT_RANGE;
