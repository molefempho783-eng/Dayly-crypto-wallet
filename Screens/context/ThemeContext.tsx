// src/context/ThemeContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { ActivityIndicator, Appearance, useColorScheme, View, Text, ColorValue } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the shape of our theme colors
export interface ThemeColors {
  cardHighlight: string;
  card: string;
  muted: string;
  icon: any;
  buttonText: any;
  border: any;
  secondary: string;
  textSecondary: string;
  background: string;
  cardBackground: string;
  text: string;
  secondaryText: string;
  placeholderText: string;
  borderColor: string;
  shadowColor: string;
  primary: string; // Main accent color
  primaryDark: string; // Darker shade of primary
  primaryLight: string; // Lighter shade of primary (e.g., for message bubbles)
  accent: string; // Secondary accent color (e.g., for certain UI elements)
  surface: string; // Color for cards, sheets, dialogs
  textPrimary: string; // Primary text color (same as 'text' usually)
  link: string; // Color for clickable links
  error: string; // Color for error messages
  placeholder: string; // Color for placeholder elements/backgrounds
  filterButtonBackground: string;
  activeFilterBackground: string;
  activeFilterText: string;
  success: string; // Added for completeness, if you use it later
  warning: string; // Added for completeness, if you use it later
  info: string;   // Added for completeness, if you use it later
// + add these keys
inputBg: string;
inputBorder: string;

}

// Define the light and dark theme color palettes
const lightColors: ThemeColors = {
  background: '#f0f2f5',
  cardBackground: '#ffffff',
  surface: '#ffffff',
  text: '#111827',
  textPrimary: '#111827',
  secondaryText: '#4B5563',
  placeholderText: '#5a5a5bff',
  borderColor: '#E5E7EB',
  shadowColor: '#000000',

  primary: '#2563EB',
  primaryDark: '#1E40AF',
  primaryLight: '#93C5FD',
  accent: '#03DAC6',

  link: '#1D4ED8',
  error: '#B00020',
  placeholder: '#E5E7EB',

  filterButtonBackground: '#E5E7EB',
  activeFilterBackground: '#2563EB',
  activeFilterText: '#ffffff',

  success: '#16A34A',
  warning: '#F59E0B',
  info: '#0284C7',

  // ==== keys used by e-hailing styles ====
  icon: '#111827',
  buttonText: '#ffffff',
  border: '#E5E7EB',
  card: '#FFFFFF',
  muted: '#6B7280',
  cardHighlight: '#EFF6FF',
  inputBg: '#FFFFFF', // TextInput background
  inputBorder: '#94A3B8',
  secondary: '',
  textSecondary: ''
};

const darkColors: ThemeColors = {
  background: '#121212',
  cardBackground: '#1e1e1e',
  surface: '#1e1e1e',
  text: '#E0E0E0',
  textPrimary: '#E0E0E0',
  secondaryText: '#A3A3A3',
  placeholderText: '#727373ff',
  borderColor: '#333333',
  shadowColor: '#000000',

  primary: '#BB86FC',
  primaryDark: '#794BC4',
  primaryLight: 'rgb(59, 26, 135)',
  accent: '#03DAC6',

  link: '#90CAF9',
  error: '#CF6679',
  placeholder: '#2A2A2A',

  filterButtonBackground: '#2A2A2A',
  activeFilterBackground: '#BB86FC',
  activeFilterText: '#121212',

  success: '#66BB6A',
  warning: '#FFEB3B',
  info: '#64B5F6',

  // ==== keys used by e-hailing styles ====
  icon: '#E0E0E0',
  buttonText: '#FFFFFF',
  border: '#333333',
  card: '#1e1e1e',
  muted: '#9CA3AF',
  cardHighlight: '#2C2F3A',
  inputBg: '#1e1e1e',
  inputBorder: '#4B5563',
  secondary: '',
  textSecondary: ''
};


// Define the context type
interface ThemeContextType {
  theme: 'light' | 'dark';
  colors: ThemeColors;
  toggleTheme: () => void;
  isThemeLoading: boolean;
}

// Create the context
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Define the key for AsyncStorage
const THEME_STORAGE_KEY = '@app_theme_preference';

// Create the ThemeProvider component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  const [isThemeLoading, setIsThemeLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme === 'light' || storedTheme === 'dark') {
          setTheme(storedTheme);
        } else {
          setTheme(systemColorScheme || 'light');
        }
      } catch (e) {
        console.error("Failed to load theme from AsyncStorage:", e);
        setTheme(systemColorScheme || 'light');
      } finally {
        setIsThemeLoading(false);
      }
    };

    loadTheme();
  }, [systemColorScheme]);

  useEffect(() => {
    if (theme !== null && !isThemeLoading) {
      const saveTheme = async () => {
        try {
          await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch (e) {
          console.error("Failed to save theme to AsyncStorage:", e);
        }
      };
      saveTheme();
    }
  }, [theme, isThemeLoading]);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme) {
        setTheme(colorScheme);
      }
    });
    return () => subscription.remove();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      return newTheme;
    });
  }, []);

  const colors = theme === 'light' ? lightColors : darkColors;

  if (isThemeLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: lightColors.background }}>
        <ActivityIndicator size="large" color={lightColors.primary} />
        <Text style={{ marginTop: 10, color: lightColors.text }}>Loading theme...</Text>
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme: theme!, colors, toggleTheme, isThemeLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
