import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PlannerProvider } from "../lib/planner";
import { colors } from "../components/ui";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PlannerProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="sources" options={{ presentation: "modal" }} />
        </Stack>
      </PlannerProvider>
    </SafeAreaProvider>
  );
}
