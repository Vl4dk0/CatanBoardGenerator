import { View, StyleSheet } from "react-native";
import CatanBoard from "../src/components/CatanBoard";
import { useTheme } from "../src/context/ThemeContext";

export default function Index() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CatanBoard />
    </View>
  );
}

// TODO: have global styles somewhere
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
