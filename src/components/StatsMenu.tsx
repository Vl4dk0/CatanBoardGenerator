import React, { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  calculateResourceDropProbability,
  type GeneratedBoard,
  type ResourceType,
} from "../logic/catanLogic";
import { useTheme } from "../context/ThemeContext";

interface StatsMenuProps {
  board: GeneratedBoard | null;
}

export default function StatsMenu({ board }: StatsMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { colors } = useTheme();

  const stats = useMemo(() => {
    if (!board) return null;
    return calculateResourceDropProbability(board.tiles);
  }, [board]);

  const sortedStats = useMemo(() => {
    if (!stats) return [];
    // Sort by probability (highest to lowest)
    return Array.from(stats.entries()).sort(
      (a: [ResourceType, number], b: [ResourceType, number]) => b[1] - a[1],
    );
  }, [stats]);

  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  const getResourceColor = (resource: ResourceType): string => {
    const resourceColors: Record<string, string> = {
      sheep: "#90EE90",
      wheat: "#FFD700",
      wood: "#8B4513",
      stone: "#808080",
      brick: "#CD5C5C",
    };
    return resourceColors[resource] || colors.text;
  };

  const styles = StyleSheet.create({
    container: {
      position: "absolute",
      top: 20,
      left: 20,
      zIndex: 1000,
      alignItems: "flex-start",
    },
    hamburgerButton: {
      backgroundColor: colors.buttonBackground,
      padding: 12,
      borderRadius: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      width: 48,
      height: 48,
      justifyContent: "center",
      alignItems: "center",
    },
    hamburgerText: {
      fontSize: 24,
      color: colors.buttonText,
      lineHeight: 24,
    },
    panel: {
      marginTop: 8,
      backgroundColor: colors.panelBackground,
      borderRadius: 8,
      padding: 16,
      minWidth: 220,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      borderWidth: 1,
      borderColor: colors.svgBorder,
    },
    title: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 12,
      textAlign: "center",
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
      paddingVertical: 4,
    },
    resourceName: {
      fontSize: 14,
      fontWeight: "600",
    },
    probability: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "400",
    },
  });

  if (!board) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Hamburger Button */}
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.hamburgerButton}
      >
        <Text style={styles.hamburgerText}>☰</Text>
      </Pressable>

      {/* Stats Panel (Collapsible) */}
      {isExpanded && stats && (
        <View style={styles.panel}>
          <Text style={styles.title}>Drop Probability</Text>
          {sortedStats.map(([resource, probability]) => (
            <View key={resource} style={styles.statRow}>
              <Text
                style={[
                  styles.resourceName,
                  { color: getResourceColor(resource) },
                ]}
              >
                {capitalize(resource)}
              </Text>
              <Text style={styles.probability}>{probability.toFixed(1)}%</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
