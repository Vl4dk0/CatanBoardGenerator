import type { ResourceType } from "./logic/catanLogic";

export const resourceColors: Record<ResourceType, string> = {
  wood: "#027d13", // Dark Green
  brick: "#9c3106", // Firebrick Red
  sheep: "#25d93a", // Light Green
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

// TODO: check if all properties are needed
export interface ThemeColors {
  background: string;
  text: string;
  buttonBackground: string;
  buttonText: string;
  buttonPressedBackground: string;
  svgBackground: string;
  svgBorder: string;
}

// Light theme
export const lightThemeColors: ThemeColors = {
  background: "#F5FCFF", // Light blue/white
  text: "#F5FCFF", // Dark gray
  buttonBackground: "#696969", // Blue
  buttonPressedBackground: "#000000", // Darker Blue
  buttonText: "#FFFFFF", // White
  svgBackground: "#e0f7fa", // Light cyan
  svgBorder: "#cccccc", // Light gray
};

// Dark theme
export const darkThemeColors: ThemeColors = {
  background: "#121212", // Very dark gray
  text: "#E5E7EB", // Light gray
  buttonBackground: "#ffffff", // Lighter Blue
  buttonPressedBackground: "#696969", // Even Lighter Blue
  buttonText: "#121212", // Dark Gray
  svgBackground: "#1f2937", // Dark slate gray
  svgBorder: "#4b5563", // Medium gray
};

// SVG rendering config
export const VIEWBOX_WIDTH = 400;
export const VIEWBOX_HEIGHT = VIEWBOX_WIDTH;
export const BOARD_CENTER_X = VIEWBOX_WIDTH / 2;
export const BOARD_CENTER_Y = VIEWBOX_HEIGHT / 2;

// Ratio of hexagon radius relative to the viewBox width (adjust for desired hex size)
export const HEX_RADIUS_RATIO = 0.08;
// Ratio of port element base size relative to the hexagon radius
export const PORT_SIZE_RATIO = 0.5;

export const HEX_SVG_RADIUS = VIEWBOX_WIDTH * 0.08;
export const PORT_ELEMENT_BASE_SIZE = HEX_SVG_RADIUS * 0.5;

export const PYTHON_PLOT_RANGE = 14;
export const SCALE_FACTOR = VIEWBOX_WIDTH / PYTHON_PLOT_RANGE;
