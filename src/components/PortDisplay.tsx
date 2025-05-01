import React from "react";
import { Circle, Text as SvgText } from "react-native-svg";
import type { ResourceType } from "../logic/catanLogic";
import { resourceColors, portResourceText } from "../constants";

interface PortDisplayProps {
  resource: ResourceType | undefined | null;
  pier1: { x: number; y: number };
  pier2: { x: number; y: number };
  size: number; // This is now PORT_ELEMENT_BASE_SIZE
  portId: number;
}

const PortDisplay: React.FC<PortDisplayProps> = ({
  resource,
  pier1,
  pier2,
  size, // Base size for calculations
  portId,
}) => {
  if (resource === undefined || resource === null) {
    console.error(
      `PortDisplay received invalid resource for port ID: ${portId}`,
    );
    return null;
  }

  const portColor = resourceColors[resource] ?? resourceColors["?"];
  // Calculate pier radius based on the passed 'size'
  const pierRadius = size * 0.35; // Adjust this factor as needed for visual size

  const midX = (pier1.x + pier2.x) / 2;
  const midY = (pier1.y + pier2.y) / 2;
  const dx = pier2.x - pier1.x;
  const dy = pier2.y - pier1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const safeLen = len === 0 ? 1 : len;
  // Calculate offset based on the passed 'size'
  const offsetScale = size * 0.8; // Adjust this factor for label distance
  const offsetX = (dy / safeLen) * offsetScale;
  const offsetY = (-dx / safeLen) * offsetScale;

  const labelText = portResourceText[resource] ?? "?";
  // Calculate font size based on the passed 'size'
  const fontSize = size * 0.5; // Adjust this factor as needed

  return (
    <>
      <Circle
        cx={pier1.x}
        cy={pier1.y}
        r={pierRadius}
        stroke={portColor}
        strokeWidth="1.5"
        fill="white"
      />
      <Circle
        cx={pier2.x}
        cy={pier2.y}
        r={pierRadius}
        stroke={portColor}
        strokeWidth="1.5"
        fill="white"
      />
      <SvgText
        x={midX + offsetX}
        y={midY + offsetY}
        fontSize={fontSize}
        fontWeight="bold"
        fill={portColor}
        textAnchor="middle"
        alignmentBaseline="central"
      >
        {labelText}
      </SvgText>
    </>
  );
};

export default PortDisplay;
