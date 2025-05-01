import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { lightThemeColors, darkThemeColors, ThemeColors } from "../constants"; // We'll define these next

type ThemeContextType = {
  theme: "light" | "dark";
  colors: ThemeColors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemTheme = useColorScheme();
  // **MODIFIED**: Default to 'dark' unless system explicitly prefers 'light'
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">(
    systemTheme === "light" ? "light" : "dark", // Default to dark
  );

  const toggleTheme = () => {
    setCurrentTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const colors = useMemo(() => {
    return currentTheme === "light" ? lightThemeColors : darkThemeColors;
  }, [currentTheme]);

  const value = useMemo(
    () => ({
      theme: currentTheme,
      colors,
      toggleTheme,
    }),
    [currentTheme, colors],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
