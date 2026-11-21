import { Stack, ThemeProvider, DarkTheme } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PlannerProvider } from "../lib/planner";
import { colors } from "../components/ui";
import { PlasmaProvider, PlasmaBackground } from "../components/plasma";
import { View } from "react-native";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PlasmaProvider>
        <View
          style={{ flex: 1, backgroundColor: colors.bg, overflow: "hidden" }}
        >
          <PlasmaBackground />
          <PlannerProvider>
            <StatusBar style="light" />
            <ThemeProvider
              value={{
                ...DarkTheme,
                colors: {
                  ...DarkTheme.colors,
                  background: "transparent",
                  card: "transparent",
                  text: colors.text,
                  primary: colors.lime,
                  border: colors.line,
                },
              }}
            >
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: "transparent" },
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="sources"
                  options={{ presentation: "modal" }}
                />
              </Stack>
            </ThemeProvider>
          </PlannerProvider>
        </View>
      </PlasmaProvider>
    </SafeAreaProvider>
  );
}
