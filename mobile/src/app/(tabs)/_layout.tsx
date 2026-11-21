import { Tabs } from "expo-router";
import { PlasmaDock } from "../../components/PlasmaDock";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <PlasmaDock {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Tonight" }} />
      <Tabs.Screen name="map" options={{ title: "Explore" }} />
      <Tabs.Screen name="saved" options={{ title: "Saved" }} />
    </Tabs>
  );
}
