import "../global.css";
import { Stack, router, usePathname } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { View, StatusBar, LogBox } from "react-native";

LogBox.ignoreAllLogs();
import { ActivityIndicator } from "react-native-paper";
import { PaperProvider, MD3DarkTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

// Syncnox brand theme for React Native Paper
const syncnoxTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#6EB46E",
    secondary: "#003220",
    background: "#001A0F",
    surface: "#0D2E1A",
    onPrimary: "#FFFFFF",
    onBackground: "#FFFFFF",
    onSurface: "#FFFFFF",
    error: "#ff4d4f",
  },
};

/**
 * Root layout — imports global.css (NativeWind), wraps with PaperProvider,
 * checks SecureStore on mount, and redirects authenticated users to Home.
 */
export default function RootLayout() {
  const { activationCode, isLoading, checkStoredCode } = useAuthStore();
  const pathName = usePathname();

  useEffect(() => {
    checkStoredCode();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (activationCode) {
        router.replace("/(home)/(tabs)/home");
      } else {
        router.replace("/");
      }
    }
  }, [isLoading, activationCode]);

  if (isLoading) {
    return (
      <PaperProvider theme={syncnoxTheme}>
        <View className="flex-1 bg-bg-deep items-center justify-center">
          <ActivityIndicator color="#6EB46E" size="large" />
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={syncnoxTheme}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: "#000000" },
        }}
      >
        <Stack.Screen name="index" options={{ animation: "fade" }} />
        <Stack.Screen
          name="login"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen name="(home)" options={{ animation: "fade" }} />
      </Stack>
    </PaperProvider>
  );
}
