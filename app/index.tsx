import { StyleSheet, View } from "react-native";
import CatanBoard from "../src/components/CatanBoard";
import { useTheme } from "../src/context/ThemeContext";

export default function Index() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CatanBoard />
    </View>
  );

  /*
  I want more something like this:
  return (
    <...>
      <ThemePicker/> -> I wish it would look the same, just want to render it from here
      <CatanBoard /> -> be exactly in the center of the screen
      <Button -> regenerate board /> -> be exactly in between bottom of the board and the bottom of the screen
    <.../>
  )
  */
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
