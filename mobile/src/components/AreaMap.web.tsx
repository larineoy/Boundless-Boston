import { View } from "react-native";
import type { Coordinate } from "../lib/types";
import { colors, ExternalLink, Icon, Label } from "./ui";

export default function AreaMap({ location }: { location: Coordinate }) {
  return (
    <View
      style={{
        height: 300,
        borderRadius: 18,
        backgroundColor: "#202b1e",
        borderWidth: 1,
        borderColor: colors.line,
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 24,
      }}
    >
      <Icon name="map" size={45} />
      <Label>
        {location.latitude.toFixed(4)}° N /{" "}
        {Math.abs(location.longitude).toFixed(4)}° W
      </Label>
      <ExternalLink
        url={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
      >
        Explore this area in Google Maps ↗
      </ExternalLink>
      <View>
        <Label>OPEN THE IOS OR ANDROID APP FOR THE NATIVE MAP</Label>
      </View>
    </View>
  );
}
