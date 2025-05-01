// app/_layout.tsx (Example structure)
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      {/* Find the screen for your index route */}
      <Stack.Screen
        name="index"
        options={{
          // Remove the title or set headerShown to false
          // Option 1: Remove title text
          // title: '', // Set an empty title
          // headerTitle: '', // Alternative way

          // Option 2: Hide the header entirely
          headerShown: false,
        }}
      />
      {/* Other screens if you have them */}
    </Stack>
  );
}
