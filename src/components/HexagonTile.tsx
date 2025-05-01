import React from "react";
import { Svg, Polygon, Circle, Text as SvgText } from "react-native-svg";
import type { ResourceType } from "../logic/catanLogic";
import { resourceColors, numberColors } from "../constants";

interface HexagonTileProps {
  resource: ResourceType | null;
  number: number | null;
  size: number; // This is HEX_SVG_RADIUS
  center: { x: number; y: number };
}

const getHexagonPoints = (
  center: { x: number; y: number },
  size: number,
): string => {
  // ... (function remains the same) ...
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle_deg = 60 * i + 30;
    const angle_rad = (Math.PI / 180) * angle_deg;
    const x = center.x + size * Math.cos(angle_rad);
    const y = center.y + size * Math.sin(angle_rad);
    points.push(`${x},${y}`);
  }
  return points.join(" ");
};

const HexagonTile: React.FC<HexagonTileProps> = ({
  resource,
  number,
  size,
  center,
}) => {
  const fillColor = resource
    ? (resourceColors[resource] ?? resourceColors.desert)
    : resourceColors.desert;
  const points = getHexagonPoints(center, size);
  // Adjust number token size relative to the hex size
  const numberTokenSize = size * 0.4;
  // Adjust font size relative to the token size
  const fontSize = numberTokenSize * 1.1;

  const textColor = number ? (numberColors[number] ?? "black") : "black";

  return (
    <>
      <Polygon
        points={points}
        fill={fillColor}
        stroke="black"
        strokeWidth="1" // Keep stroke thin relative to size
      />
      {number && resource !== "desert" && (
        <>
          <Circle
            cx={center.x}
            cy={center.y}
            r={numberTokenSize}
            fill="white"
            stroke="black"
            strokeWidth="0.5"
          />
          <SvgText
            x={center.x}
            y={center.y}
            fontSize={fontSize}
            fontWeight="bold"
            fill={textColor}
            textAnchor="middle"
            alignmentBaseline="central"
            // Adjust dy to move text up slightly. Try 0 or a small negative value.
            // Remove dy=".3em" or change it:
            dy="0" // Or try "-0.1em" if 0 isn't enough up
          >
            {number}
          </SvgText>
        </>
      )}
    </>
  );
};

export default HexagonTile;
