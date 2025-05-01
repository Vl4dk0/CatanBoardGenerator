// app/index.tsx
import { View, StyleSheet } from "react-native";
import CatanBoard from "../src/components/CatanBoard";
import { useTheme } from "../src/context/ThemeContext"; // Import useTheme

export default function Index() {
  const { colors } = useTheme(); // Get theme colors

  return (
    // Apply theme background color to the main container
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CatanBoard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // No background color here, applied dynamically
  },
});
