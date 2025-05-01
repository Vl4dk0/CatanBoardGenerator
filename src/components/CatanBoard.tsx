// src/components/CatanBoard.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Button,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import Svg from "react-native-svg";
import { generateCatanBoard, type GeneratedBoard } from "../logic/catanLogic";
import HexagonTile from "./HexagonTile";
import PortDisplay from "./PortDisplay";
import {
  // Import constants
  VIEWBOX_WIDTH,
  VIEWBOX_HEIGHT,
  BOARD_CENTER_X,
  BOARD_CENTER_Y,
  SCALE_FACTOR,
  HEX_SVG_RADIUS, // Use new constant for hex size
  PORT_ELEMENT_BASE_SIZE, // Use new constant for port size
} from "../constants"; // Adjust path if needed

const HEX_RAD_FOR_Y = 2 / Math.sqrt(3); // From original Python code for Y scaling
const convertCoords = (x: number, y: number) => {
  let svgX = x * SCALE_FACTOR;
  let svgY = y * SCALE_FACTOR;
  svgX = BOARD_CENTER_X + svgX;
  svgY = BOARD_CENTER_Y - svgY; // Invert Y
  return { x: svgX, y: svgY };
};

const CatanBoard: React.FC = () => {
  const [board, setBoard] = useState<GeneratedBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateNewBoard = useCallback(() => {
    // ... (generation logic remains the same) ...
    console.log("Generating new board...");
    setIsLoading(true);
    setError(null);
    setBoard(null); // Clear previous board immediately

    setTimeout(() => {
      try {
        const startTime = Date.now();
        const newBoard = generateCatanBoard(true, true);
        const endTime = Date.now();
        console.log(`Generation took ${endTime - startTime}ms`);

        if (newBoard) {
          const invalidPort = newBoard.ports.find(
            (p) => p.resource === undefined || p.resource === null,
          );
          if (invalidPort) {
            console.error(
              "Generated board contains invalid port:",
              invalidPort,
            );
            setError("Generation error: Invalid port data detected.");
          } else {
            console.log("Board generated successfully.");
            setBoard(newBoard);
          }
        } else {
          console.error("Board generation returned null.");
          setError(
            "Failed to generate a valid board configuration. Please try again.",
          );
        }
      } catch (e: any) {
        console.error("Error during board generation:", e);
        setError(`An unexpected error occurred: ${e.message || e}`);
      } finally {
        setIsLoading(false);
      }
    }, 50);
  }, []);

  useEffect(() => {
    generateNewBoard();
  }, [generateNewBoard]);

  return (
    // Removed the outer title Text component
    <View style={styles.container}>
      <View style={styles.svgContainer}>
        {isLoading && <ActivityIndicator size="large" color="#0000ff" />}
        {error && !isLoading && <Text style={styles.errorText}>{error}</Text>}
        {!isLoading && !error && board && (
          <Svg
            height="100%"
            width="100%"
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          >
            {/* Render Tiles */}
            {board.tiles.map((tile) => {
              const center = convertCoords(
                tile.x,
                tile.y * 1.5 * HEX_RAD_FOR_Y,
              );
              return (
                <HexagonTile
                  key={`tile-${tile.id}`}
                  resource={tile.resource}
                  number={tile.number}
                  // Pass the fixed SVG radius directly
                  size={HEX_SVG_RADIUS}
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
                console.warn(
                  `Skipping rendering port at index ${index} due to missing coordinate data:`,
                  port,
                );
                return null;
              }
              const pier1 = convertCoords(port.x1, port.y1);
              const pier2 = convertCoords(port.x2, port.y2);
              return (
                <PortDisplay
                  key={`port-${port.id}`}
                  portId={port.id}
                  resource={port.resource}
                  pier1={pier1}
                  pier2={pier2}
                  // Pass the fixed base size for port elements
                  size={PORT_ELEMENT_BASE_SIZE}
                />
              );
            })}
          </Svg>
        )}
        {!isLoading && !board && !error && (
          <Text>No board data available.</Text>
        )}
      </View>
      {/* Keep the button outside the SVG container */}
      <Button
        title="Generate New Board"
        onPress={generateNewBoard}
        disabled={isLoading}
      />
    </View>
  );
};

// Adjust styles - remove title margin, adjust container padding/justifyContent
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center", // Center vertically overall
    paddingVertical: 20, // Add some padding top/bottom
    paddingHorizontal: 10,
    width: "100%",
  },
  // Removed title style
  svgContainer: {
    width: "95%", // Use most of the width
    aspectRatio: 1, // Keep it square
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e0f7fa",
    marginBottom: 20, // Add space between board and button
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginHorizontal: 10,
  },
});

export default CatanBoard;
