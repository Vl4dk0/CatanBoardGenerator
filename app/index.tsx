import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
} from "react-native";
import CatanBoard from "../src/components/CatanBoard";
import {
  generateCatanBoard,
  type GeneratedBoard,
} from "../src/logic/catanLogic";
import {
  HEX_SVG_RADIUS,
  PORT_ELEMENT_BASE_SIZE,
  SCALE_FACTOR,
  VIEWBOX_WIDTH,
} from "../src/constants";
import { useTheme } from "../src/context/ThemeContext";
import { useBoardQueue } from "../src/hooks/useBoardQueue";

export default function Index() {
  const [board, setBoard] = useState<GeneratedBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();

  // Board Queue Hook
  const {
    getNextBoard,
    queueSize,
    startBackgroundGeneration,
    stopBackgroundGeneration,
  } = useBoardQueue();

  // Board Generation
  const generateNewBoard = useCallback(() => {
    console.log("Generating new board...");

    // Try to use pre-generated board first
    const preGeneratedBoard = getNextBoard();

    if (preGeneratedBoard) {
      // Instant display from queue!
      console.log(`Using pre-generated board (${queueSize} remaining)`);
      setBoard(preGeneratedBoard);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Fallback to regular synchronous generation
    console.log("No pre-generated boards, generating synchronously...");
    setIsLoading(true);
    setError(null);
    setBoard(null);
    setTimeout(() => {
      try {
        const startTime = Date.now();
        const newBoard = generateCatanBoard();
        const endTime = Date.now();
        console.log(`Synchronous generation took ${endTime - startTime}ms`);
        if (newBoard) {
          setBoard(newBoard);
          setError(null);
        } else {
          setError(
            "Failed to generate a board within the attempt limit. Please try again.",
          );
          setBoard(null);
        }
      } catch (e: any) {
        setError(`An error occurred: ${e.message || e}`);
        setBoard(null);
      } finally {
        setIsLoading(false);
      }
    }, 50);
  }, [getNextBoard, queueSize]);

  // Generate initial board on mount only
  useEffect(() => {
    generateNewBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start background generation after viewing board for 1 second
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (board && !isLoading && !error) {
      console.log("Board displayed, starting 1-second timer...");
      timer = setTimeout(() => {
        console.log("1 second elapsed, starting background generation...");
        startBackgroundGeneration();
      }, 1000);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      stopBackgroundGeneration();
    };
  }, [board, isLoading, error, startBackgroundGeneration, stopBackgroundGeneration]);

  const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: {
      flex: 1,
      alignItems: "center",
      height: "100%",
      paddingVertical: 40,
    },
    // Board area takes available space and centers its content
    boardArea: {
      flex: 1,
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    svgContainer: {
      width: "100%",
      height: "90%",
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
      width: "60%",
      maxWidth: 400,
    },
    buttonPressed: { backgroundColor: colors.buttonPressedBackground },
    buttonText: { color: colors.buttonText, fontSize: 16, fontWeight: "bold" },
    loadingOrErrorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    errorText: { color: "red", textAlign: "center" },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Board Area */}
        <View style={styles.boardArea}>
          <View style={styles.svgContainer}>
            {isLoading ? (
              <View style={styles.loadingOrErrorContainer}>
                <ActivityIndicator size="large" color={colors.text} />
              </View>
            ) : error ? (
              <View style={styles.loadingOrErrorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <CatanBoard
                board={board}
                viewBoxSize={VIEWBOX_WIDTH}
                hexRadius={HEX_SVG_RADIUS}
                portSize={PORT_ELEMENT_BASE_SIZE}
                scaleFactor={SCALE_FACTOR}
              />
            )}
          </View>
        </View>

        {/* Button Area */}
        <View style={styles.buttonArea}>
          <Pressable
            onPress={generateNewBoard}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.button,
              pressed ? styles.buttonPressed : null,
              isLoading ? { opacity: 0.5 } : null,
            ]}
          >
            <Text style={styles.buttonText}>
              {queueSize > 0
                ? `Next Board (${queueSize} ready)`
                : "Generate New Board"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
