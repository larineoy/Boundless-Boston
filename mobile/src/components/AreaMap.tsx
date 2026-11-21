import { useEffect, useRef } from "react";
import Constants, { ExecutionEnvironment } from "expo-constants";
import MapView, { Circle, Marker } from "react-native-maps";
import { Platform, StyleSheet, Text, View } from "react-native";
import type { Coordinate } from "../lib/types";
import { colors, ExternalLink, Icon, s } from "./ui";

export default function AreaMap({ location }: { location: Coordinate }) {
  const map = useRef<MapView>(null);
  useEffect(() => {
    map.current?.animateToRegion(
      { ...location, latitudeDelta: 0.028, longitudeDelta: 0.028 },
      400,
    );
  }, [location]);
  if (
    Platform.OS === "android" &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
    !Constants.expoConfig?.extra?.androidMapsConfigured
  ) {
    return (
      <View
        style={[
          styles.frame,
          {
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            gap: 20,
          },
        ]}
      >
        <Icon name="map" size={36} />
        <Text style={s.body}>
          Explore your starting point and the surrounding area.
        </Text>
        <ExternalLink
          url={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
        >
          Open area in Google Maps ↗
        </ExternalLink>
      </View>
    );
  }
  return (
    <View style={styles.frame}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          ...location,
          latitudeDelta: 0.028,
          longitudeDelta: 0.028,
        }}
        userInterfaceStyle="dark"
        customMapStyle={darkMap}
        showsCompass
        showsScale
      >
        <Circle
          center={location}
          radius={700}
          strokeColor={colors.lime}
          fillColor="#c6f36a15"
          strokeWidth={1}
        />
        <Marker
          coordinate={location}
          title="Your plan starts here"
          pinColor={colors.lime}
        />
      </MapView>
    </View>
  );
}
const styles = StyleSheet.create({
  frame: {
    height: 380,
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
const darkMap = [
  { elementType: "geometry", stylers: [{ color: "#222c22" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#aab79e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#20291e" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#14221f" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#3e4d34" }],
  },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];
