import React from "react";
import { View, StyleSheet } from "react-native"; // StyleSheet might not be needed now
import Svg from "react-native-svg";
import { type GeneratedBoard } from "../logic/catanLogic"; // Adjust path
import HexagonTile from "./HexagonTile"; // Adjust path
import PortDisplay from "./PortDisplay"; // Adjust path
// Constants are no longer imported here for sizing, they come via props

// Helper function now uses scaleFactor from props
const HEX_RAD_FOR_Y = 2 / Math.sqrt(3);
const convertCoords = (
  x: number,
  y: number,
  scaleFactor: number,
  viewBoxSize: number,
) => {
  const centerX = viewBoxSize / 2;
  const centerY = viewBoxSize / 2;
  let svgX = x * scaleFactor;
  let svgY = y * scaleFactor;
  svgX = centerX + svgX;
  svgY = centerY - svgY; // Invert Y for SVG
  return { x: svgX, y: svgY };
};

// Define props for the component including dynamic sizes
interface CatanBoardProps {
  board: GeneratedBoard | null;
  viewBoxSize: number;
  hexRadius: number;
  portSize: number;
  scaleFactor: number;
}

const CatanBoard: React.FC<CatanBoardProps> = ({
  board,
  viewBoxSize,
  hexRadius,
  portSize,
  scaleFactor,
}) => {
  if (!board) {
    return null; // Render nothing if no board data
  }

  // Calculate center based on dynamic viewBoxSize

  return (
    <Svg
      height="100%"
      width="100%"
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
    >
      {/* Render Tiles */}
      {board.tiles.map((tile) => {
        const center = convertCoords(
          tile.x,
          tile.y * 1.5 * HEX_RAD_FOR_Y,
          scaleFactor, // Pass dynamic scaleFactor
          viewBoxSize, // Pass dynamic viewBoxSize
        );
        return (
          <HexagonTile
            key={`tile-${tile.id}`}
            resource={tile.resource}
            number={tile.number}
            size={hexRadius} // Pass dynamic hexRadius
            center={center}
          />
        );
      })}
      {/* Render Ports */}
      {board.ports.map((port, index) => {
        if (
          !port ||
          port.x1 === undefined ||
          port.y1 === undefined ||
          port.x2 === undefined ||
          port.y2 === undefined
        ) {
          return null;
        }
        const pier1 = convertCoords(port.x1, port.y1, scaleFactor, viewBoxSize);
        const pier2 = convertCoords(port.x2, port.y2, scaleFactor, viewBoxSize);
        return (
          <PortDisplay
            key={`port-${port.id}`}
            portId={port.id}
            resource={port.resource}
            pier1={pier1}
            pier2={pier2}
            size={portSize} // Pass dynamic portSize
          />
        );
      })}
    </Svg>
  );
};

export default CatanBoard;
