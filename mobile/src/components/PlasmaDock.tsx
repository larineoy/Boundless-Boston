import { useEffect, useState, type ComponentProps } from "react";
import type { Tabs } from "expo-router";
import { Keyboard, Text, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlasmaPressable, PlasmaSurface } from "./plasma";
import { colors, Icon } from "./ui";

type DockProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];
const icons = { index: "compass", map: "map", saved: "heart" } as const;
export function PlasmaDock({
  state,
  descriptors,
  emitter,
  navigateToTab,
}: DockProps) {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  if (keyboardVisible) return null;
  return (
    <View
      pointerEvents="box-none"
      role="tablist"
      style={[styles.position, { bottom: Math.max(insets.bottom, 14) }]}
    >
      <PlasmaSurface
        radius={34}
        elevated
        blur
        style={{ width: "100%", maxWidth: 530 }}
        contentStyle={styles.dock}
      >
        {state.routes.map((route, index) => {
          const selected = state.index === index;
          return (
            <PlasmaPressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={
                descriptors[route.key].options.title || route.name
              }
              accessibilityState={{ selected }}
              selected={selected}
              radius={27}
              style={{ flex: 1 }}
              onPress={() => {
                const event = emitter.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!selected && !event.defaultPrevented)
                  navigateToTab(route.key);
              }}
              onLongPress={() =>
                emitter.emit({ type: "tabLongPress", target: route.key })
              }
            >
              <View style={styles.item}>
                <Icon
                  name={icons[route.name as keyof typeof icons] || "compass"}
                  size={19}
                  color={selected ? colors.lime : colors.muted}
                />
                <Text
                  style={[
                    styles.label,
                    { color: selected ? colors.text : colors.muted },
                  ]}
                >
                  {descriptors[route.key].options.title || route.name}
                </Text>
              </View>
            </PlasmaPressable>
          );
        })}
      </PlasmaSurface>
    </View>
  );
}
const styles = StyleSheet.create({
  position: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
  },
  dock: {
    padding: 6,
    gap: 5,
    flexDirection: "row",
    backgroundColor: "#10281c94",
  },
  item: {
    gap: 5,
    alignItems: "center",
    minHeight: 38,
    justifyContent: "center",
  },
  label: { fontSize: 10, fontWeight: "600" },
});
