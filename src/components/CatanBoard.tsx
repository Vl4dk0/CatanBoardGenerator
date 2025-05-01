import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
} from "react-native";
import Svg from "react-native-svg";
import { generateCatanBoard, type GeneratedBoard } from "../logic/catanLogic"; // Adjust path if needed
import HexagonTile from "./HexagonTile"; // Adjust path if needed
import PortDisplay from "./PortDisplay"; // Adjust path if needed
import ThemeToggle from "./ThemeToggle"; // Adjust path if needed
import { useTheme } from "../context/ThemeContext"; // Adjust path if needed
import {
  VIEWBOX_WIDTH,
  VIEWBOX_HEIGHT,
  BOARD_CENTER_X,
  BOARD_CENTER_Y,
  SCALE_FACTOR,
  HEX_SVG_RADIUS,
  PORT_ELEMENT_BASE_SIZE,
} from "../constants"; // Adjust path if needed

// Helper function to convert coordinates
const HEX_RAD_FOR_Y = 2 / Math.sqrt(3);
const convertCoords = (x: number, y: number) => {
  let svgX = x * SCALE_FACTOR;
  let svgY = y * SCALE_FACTOR;
  svgX = BOARD_CENTER_X + svgX;
  svgY = BOARD_CENTER_Y - svgY; // Invert Y for SVG
  return { x: svgX, y: svgY };
};

const CatanBoard: React.FC = () => {
  // --- State Hooks ---
  const [board, setBoard] = useState<GeneratedBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // For timeout or unexpected errors

  // --- Theme Hook ---
  const { colors } = useTheme(); // Get colors from theme context

  // --- Board Generation Logic ---
  const generateNewBoard = useCallback(() => {
    console.log("Generating new board...");
    setIsLoading(true);
    setError(null); // Clear previous errors
    setBoard(null); // Clear previous board

    // Use setTimeout to allow UI to update before potentially long generation
    setTimeout(() => {
      try {
        const startTime = Date.now();
        const newBoard = generateCatanBoard(true, true); // Call the generator
        const endTime = Date.now();
        console.log(`Generation took ${endTime - startTime}ms`);

        if (newBoard) {
          // Safeguard check for invalid port data
          const invalidPort = newBoard.ports.find(
            (p) => p.resource === undefined || p.resource === null,
          );
          if (invalidPort) {
            console.error(
              "Generated board contains invalid port:",
              invalidPort,
            );
            setError("Generation error: Invalid port data detected.");
            setBoard(null);
          } else {
            console.log("Board generated successfully.");
            setBoard(newBoard);
            setError(null); // Ensure no error is shown
          }
        } else {
          // Handle null return from generator (timeout)
          console.warn("Board generation timed out.");
          setError(
            "Failed to generate a board within the attempt limit. Please try again.",
          );
          setBoard(null);
        }
      } catch (e: any) {
        // Handle unexpected errors during generation
        console.error("Unexpected error during board generation:", e);
        setError(`An unexpected error occurred: ${e.message || e}`);
        setBoard(null);
      } finally {
        setIsLoading(false); // Ensure loading state is turned off
      }
    }, 50); // Small delay before starting generation
  }, []); // Empty dependency array means this function is created once

  // --- Effect Hook ---
  // Generate the initial board when the component mounts
  useEffect(() => {
    generateNewBoard();
  }, [generateNewBoard]); // Depend on the memoized function

  // --- Dynamic Styles (Defined *before* return statement) ---
  // These styles depend on the theme colors
  const themedStyles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 10,
      paddingTop: 60, // Space for toggle
      paddingBottom: 150, // Space at the very bottom
    },
    boardArea: {
      flex: 1, // Grow to push button down
      width: "100%",
      justifyContent: "center", // Center board vertically in this area
      alignItems: "center", // Center board horizontally
      marginBottom: 20, // Space above button area
    },
    svgContainer: {
      width: "95%",
      aspectRatio: 1,
      borderWidth: 1,
      borderColor: colors.svgBorder,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.svgBackground,
    },
    buttonArea: {
      width: "100%",
      alignItems: "center",
    },
    button: {
      backgroundColor: colors.buttonBackground,
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      minWidth: "60%",
    },
    buttonPressed: {
      backgroundColor: colors.buttonPressedBackground,
    },
    buttonText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: "bold",
    },
    loadingOrErrorContainer: {
      // Used to center content within svgContainer when board isn't shown
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20, // Add padding for text
    },
    errorText: {
      color: "red", // Keep error text red for visibility
      textAlign: "center",
    },
  });

  // --- Render Logic ---
  return (
    <SafeAreaView style={themedStyles.safeArea}>
      <ThemeToggle />
      <View style={themedStyles.container}>
        {/* Board Area */}
        <View style={themedStyles.boardArea}>
          <View style={themedStyles.svgContainer}>
            {/* Loading State */}
            {isLoading && (
              <View style={themedStyles.loadingOrErrorContainer}>
                <ActivityIndicator size="large" color={colors.text} />
              </View>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <View style={themedStyles.loadingOrErrorContainer}>
                <Text style={themedStyles.errorText}>{error}</Text>
              </View>
            )}

            {/* Success State: Display Board */}
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
                      size={HEX_SVG_RADIUS}
                      center={center}
                    />
                  );
                })}
                {/* Render Ports */}
                {board.ports.map((port, index) => {
                  // Basic check for valid port data before rendering
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
                    return null; // Don't render this port
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
                      size={PORT_ELEMENT_BASE_SIZE}
                    />
                  );
                })}
              </Svg>
            )}
          </View>
        </View>

        {/* Button Area */}
        <View style={themedStyles.buttonArea}>
          <Pressable
            onPress={generateNewBoard}
            disabled={isLoading}
            style={({ pressed }) => [
              themedStyles.button,
              pressed ? themedStyles.buttonPressed : null, // Apply pressed style conditionally
              isLoading ? { opacity: 0.5 } : null, // Dim button when loading
            ]}
          >
            <Text style={themedStyles.buttonText}>Generate New Board</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CatanBoard;
