import React from "react";
import { Polygon, Circle, Text as SvgText } from "react-native-svg";
import type { ResourceType } from "../logic/catanLogic";
import { resourceColors, numberColors } from "../constants";

interface HexagonTileProps {
  resource: ResourceType | null;
  number: number | null;
  size: number;
  center: { x: number; y: number };
}

const getHexagonPoints = (
  center: { x: number; y: number },
  size: number,
): string => {
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
  const numberTokenSize = size * 0.4;
  const fontSize = numberTokenSize * 1.1;

  const textColor = number ? (numberColors[number] ?? "black") : "black";

  return (
    <>
      <Polygon
        points={points}
        fill={fillColor}
        stroke="black"
        strokeWidth="1"
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
            dy="0"
          >
            {number}
          </SvgText>
        </>
      )}
    </>
  );
};

export default HexagonTile;
