import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useState, type ComponentProps, type ReactNode } from "react";
import { PlasmaPressable, PlasmaSurface, plasma } from "./plasma";

export const colors = {
  bg: plasma.bg,
  panel: "#17372c",
  line: plasma.line,
  lime: "#c6f36a",
  text: plasma.text,
  muted: plasma.muted,
  dim: "#8ba99b",
};
export const mono = Platform.OS === "ios" ? "Menlo" : "monospace";
export const serif = Platform.OS === "ios" ? "Georgia" : "serif";
export function Icon({
  name,
  size = 19,
  color = colors.lime,
}: {
  name: ComponentProps<typeof Feather>["name"];
  size?: number;
  color?: ComponentProps<typeof Feather>["color"];
}) {
  return <Feather name={name} size={size} color={color} />;
}
export function Label({ children }: { children: ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}
export function Panel({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <PlasmaSurface contentStyle={style}>{children}</PlasmaSurface>;
}
export function Button({
  title,
  onPress,
  disabled,
  secondary = false,
  icon = "arrow-up-right",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  icon?: ComponentProps<typeof Feather>["name"];
}) {
  return (
    <PlasmaPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      solid={!secondary}
      radius={26}
      style={{ minHeight: 54 }}
    >
      <View style={s.button}>
        <Text style={[s.buttonText, secondary && { color: colors.text }]}>
          {title}
        </Text>
        <Icon
          name={icon}
          color={secondary ? colors.lime : colors.bg}
          size={18}
        />
      </View>
    </PlasmaPressable>
  );
}
export function Header() {
  return (
    <View style={s.header}>
      <View style={s.row}>
        <PlasmaSurface radius={22} contentStyle={s.logo}>
          <Icon name="compass" size={18} />
        </PlasmaSurface>
        <Text style={s.brand}>
          boundless<Text style={{ color: colors.lime }}>.</Text>
        </Text>
      </View>
      <PlasmaPressable
        accessibilityRole="button"
        accessibilityLabel="Source information and neighborhood notes"
        onPress={() => router.push("/sources")}
        style={s.iconButton}
      >
        <Icon name="sliders" color={colors.muted} />
      </PlasmaPressable>
    </View>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <View accessibilityRole="alert" style={s.notice}>
      <Text style={s.noticeText}>{children}</Text>
    </View>
  );
}
export function ExternalLink({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  const [error, setError] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="link"
        onPress={() => {
          void Linking.openURL(url).catch(() => setError(true));
        }}
        style={{ paddingVertical: 5 }}
      >
        <Text style={s.link}>{children}</Text>
      </Pressable>
      {error && (
        <Text style={s.caption}>Could not open this link on your device.</Text>
      )}
    </>
  );
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, overflow: "hidden" },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 135,
    gap: 22,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  header: {
    marginHorizontal: 20,
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  logo: {
    width: 38,
    height: 38,
    padding: 0,
    gap: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  brand: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "700",
    letterSpacing: -1,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: colors.muted,
    fontFamily: mono,
    fontSize: 10,
    letterSpacing: 1.3,
    lineHeight: 16,
  },
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 19,
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "500",
    letterSpacing: -0.8,
  },
  body: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  caption: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  button: {
    width: "100%",
    minHeight: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  buttonText: { fontSize: 14, color: colors.bg, fontWeight: "700" },
  secondary: {
    backgroundColor: "#283322",
    borderWidth: 1,
    borderColor: colors.line,
  },
  notice: {
    backgroundColor: "#392e24",
    borderWidth: 1,
    borderColor: "#69513b",
    borderRadius: 12,
    padding: 15,
  },
  noticeText: { color: "#efcfb3", fontSize: 13, lineHeight: 20 },
  link: {
    color: colors.lime,
    fontSize: 11,
    lineHeight: 17,
    textDecorationLine: "underline",
  },
});
