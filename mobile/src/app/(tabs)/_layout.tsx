import { Tabs } from "expo-router";
import { colors, Icon } from "../../components/ui";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.dim,
        tabBarStyle: {
          backgroundColor: "#171e16",
          borderTopColor: colors.line,
          paddingTop: 9,
        },
        tabBarLabelStyle: { fontSize: 10, paddingBottom: 3 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tonight",
          tabBarIcon: ({ color }) => (
            <Icon
              name="compass"
              color={typeof color === "string" ? color : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Around you",
          tabBarIcon: ({ color }) => (
            <Icon
              name="map"
              color={typeof color === "string" ? color : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color }) => (
            <Icon
              name="heart"
              color={typeof color === "string" ? color : colors.muted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
