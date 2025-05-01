import React from "react";
import { StyleSheet, Pressable } from "react-native";
import { useTheme } from "../context/ThemeContext";
import Ionicons from "@expo/vector-icons/Ionicons";

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme, colors } = useTheme();
  const isDark = theme === "dark";

  return (
    <Pressable
      style={styles.toggleButton}
      onPress={toggleTheme}
      accessibilityLabel="Toggle theme"
      accessibilityRole="button"
    >
      <Ionicons
        name="sunny"
        size={20}
        color={colors.text}
        style={[styles.icon, { opacity: isDark ? 0.5 : 1 }]}
      />
      <Ionicons
        name="moon"
        size={20}
        color={colors.text}
        style={[styles.icon, { opacity: isDark ? 1 : 0.5 }]}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  toggleButton: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    position: "absolute",
    top: 60,
    right: 15,
  },
  icon: {
    marginRight: 5,
  },
});

export default ThemeToggle;
