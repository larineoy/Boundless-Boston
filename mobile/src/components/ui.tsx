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

export const colors = {
  bg: "#111611",
  panel: "#1b221a",
  line: "#35402e",
  lime: "#c6f36a",
  text: "#f0f1e8",
  muted: "#a2ad99",
  dim: "#778570",
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
  return <View style={[s.panel, style]}>{children}</View>;
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
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        (disabled || pressed) && { opacity: 0.6 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: colors.text }]}>
        {title}
      </Text>
      <Icon name={icon} color={secondary ? colors.lime : colors.bg} size={18} />
    </Pressable>
  );
}
export function Header() {
  return (
    <View style={s.header}>
      <View style={s.row}>
        <View style={s.logo}>
          <Icon name="compass" size={18} />
        </View>
        <Text style={s.brand}>
          boundless<Text style={{ color: colors.lime }}>.</Text>
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Source information and neighborhood notes"
        onPress={() => router.push("/sources")}
        style={s.iconButton}
      >
        <Icon name="sliders" color={colors.muted} />
      </Pressable>
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
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 22, paddingBottom: 32, gap: 18 },
  header: {
    marginHorizontal: 22,
    height: 68,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#687f41",
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
    fontSize: 9,
    letterSpacing: 1.6,
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
    backgroundColor: colors.lime,
    borderRadius: 10,
    paddingHorizontal: 18,
    minHeight: 50,
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
