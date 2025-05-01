// app/_layout.tsx
import { Stack } from "expo-router";
import { ThemeProvider } from "../src/context/ThemeContext"; // Adjust path

export default function RootLayout() {
  return (
    // Wrap the entire layout with the ThemeProvider
    <ThemeProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false, // Keep header hidden
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
