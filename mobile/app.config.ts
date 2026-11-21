import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Boundless Boston",
  slug: "boundless-boston",
  scheme: "boundless-boston",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.boundlessboston.navigator",
  },
  android: {
    package: "com.boundlessboston.navigator",
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#111611",
    },
  },
  web: { favicon: "./assets/favicon.png", bundler: "metro", output: "single" },
  extra: { androidMapsConfigured: !!process.env.ANDROID_GOOGLE_MAPS_API_KEY },
  plugins: [
    "expo-router",
    "expo-font",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#111611",
        image: "./assets/icon.png",
        imageWidth: 120,
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Allow Boundless Boston to find nearby places and estimate your way home.",
      },
    ],
    [
      "react-native-maps",
      { androidGoogleMapsApiKey: process.env.ANDROID_GOOGLE_MAPS_API_KEY },
    ],
  ],
});
