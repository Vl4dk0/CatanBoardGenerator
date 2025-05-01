// app/index.tsx
import { View, StyleSheet } from "react-native";
import CatanBoard from "../src/components/CatanBoard"; // Adjust path if needed

export default function Index() {
  return (
    <View style={styles.container}>
      <CatanBoard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF", // Optional background color
  },
});
