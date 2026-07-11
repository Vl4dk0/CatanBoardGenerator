import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  SafeAreaView,
} from "react-native";
import CatanBoard from "../src/components/CatanBoard";
import StatsMenu from "../src/components/StatsMenu";
import { type GeneratedBoard } from "../src/logic/catanLogic";
import { fetchBoard } from "../src/api/boardApi";
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
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();

  // Board Queue Hook
  const {
    getNextBoard,
    startBackgroundGeneration,
    stopBackgroundGeneration,
  } = useBoardQueue();

  // Board Generation
  const generateNewBoard = useCallback(async () => {
    // Try to use a prefetched board first (instant swap, no loading state).
    const preGeneratedBoard = getNextBoard();

    if (preGeneratedBoard) {
      setBoard(preGeneratedBoard);
      setError(null);
      return;
    }

    // Otherwise fetch one directly from the backend. Keep the current board on
    // screen until the fetch resolves rather than flashing a loading overlay.
    setError(null);
    try {
      const newBoard = await fetchBoard();
      setBoard(newBoard);
      setError(null);
    } catch (e: any) {
      setError(
        `Couldn't reach the board service. Please check your connection and try again.\n(${e?.message ?? e})`,
      );
    }
  }, [getNextBoard]);

  // Generate initial board on mount only
  useEffect(() => {
    generateNewBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start background generation after viewing board for 1 second
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (board && !error) {
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
  }, [board, error, startBackgroundGeneration, stopBackgroundGeneration]);

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
    errorContainer: {
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
        {/* Stats Menu (Top-Left) */}
        <StatsMenu board={board} />

        {/* Board Area */}
        <View style={styles.boardArea}>
          <View style={styles.svgContainer}>
            {error ? (
              <View style={styles.errorContainer}>
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
            style={({ pressed }) => [
              styles.button,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.buttonText}>Generate Board</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
