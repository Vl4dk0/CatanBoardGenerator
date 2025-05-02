import type { ResourceType } from "./logic/catanLogic"; // Adjust path if logic file is elsewhere

export const resourceColors: Record<ResourceType, string> = {
  wood: "#215c2a", // Dark Green
  brick: "#B22222", // Firebrick Red
  sheep: "#90EE90", // Light Green
  wheat: "#FFD700", // Gold (Yellow)
  stone: "#808080", // Gray
  desert: "#F5DEB3", // Wheat (color name, looks like sand)
  "?": "#696969", // Dim Gray for unknown/generic port
};

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

export const portResourceText: Partial<Record<ResourceType, string>> = {
  wood: "Wood",
  brick: "Brick",
  sheep: "Sheep",
  wheat: "Wheat",
  stone: "Stone",
  "?": "3:1",
};

// TODO: check if all are needed
export interface ThemeColors {
  background: string;
  text: string;
  buttonBackground: string;
  buttonText: string;
  buttonPressedBackground: string;
  svgBackground: string;
  svgBorder: string;
  switchThumb: string;
  switchTrack: string;
}

// TODO: rethink the colors, mainly for the button

// Light theme
export const lightThemeColors: ThemeColors = {
  background: "#F5FCFF", // Light blue/white
  text: "#111827", // Dark gray
  buttonBackground: "#3b82f6", // Blue
  buttonText: "#FFFFFF", // White
  buttonPressedBackground: "#2563eb", // Darker Blue
  svgBackground: "#e0f7fa", // Light cyan
  svgBorder: "#cccccc", // Light gray
  switchThumb: "#f4f3f4",
  switchTrack: "#767577",
};

// Dark theme
export const darkThemeColors: ThemeColors = {
  background: "#121212", // Very dark gray
  text: "#E5E7EB", // Light gray
  buttonBackground: "#60a5fa", // Lighter Blue
  buttonText: "#111827", // Dark Gray
  buttonPressedBackground: "#93c5fd", // Even Lighter Blue
  svgBackground: "#1f2937", // Dark slate gray
  svgBorder: "#4b5563", // Medium gray
  switchThumb: "#3b82f6", // Blue
  switchTrack: "#4b5563",
};

// TODO: dynamically calculate the viewbox width and height based on the screen size
// then calculate the svg_radius based on that.

// SVG rendering config
export const VIEWBOX_WIDTH = 400;
export const VIEWBOX_HEIGHT = VIEWBOX_WIDTH;
export const BOARD_CENTER_X = VIEWBOX_WIDTH / 2;
export const BOARD_CENTER_Y = VIEWBOX_HEIGHT / 2;

export const HEX_SVG_RADIUS = VIEWBOX_WIDTH * 0.08;
export const PORT_ELEMENT_BASE_SIZE = HEX_SVG_RADIUS * 0.5;

export const PYTHON_PLOT_RANGE = 14;
export const SCALE_FACTOR = VIEWBOX_WIDTH / PYTHON_PLOT_RANGE;
