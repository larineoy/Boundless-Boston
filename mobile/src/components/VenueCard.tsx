import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Linking, Share, StyleSheet, Text, View } from "react-native";
import { usePlanner } from "../lib/planner";
import type { Recommendation } from "../lib/types";
import {
  colors,
  ExternalLink,
  Icon,
  Label,
  mono,
  Notice,
  Panel,
  s,
} from "./ui";
import { PlasmaPressable, PlasmaReveal, PlasmaSurface } from "./plasma";

export function VenueCard({
  recommendation: r,
  index,
}: {
  recommendation: Recommendation;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [actionError, setActionError] = useState("");
  const { savedIds, toggleSaved, storageReady } = usePlanner();
  const saved = savedIds.includes(r.venue.id);
  const transit =
    (
      {
        predicted_round_trip: "Live round trip",
        scheduled_round_trip: "Scheduled return",
        walking_fallback: "Walk fallback",
      } as Record<string, string>
    )[r.reachability.method] || "Transit check";
  const score = Math.max(0, Math.min(100, Math.round(r.score.value * 100)));
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${r.venue.lat},${r.venue.lng}&travelmode=walking`;
  const demo = r.venue.id.startsWith("demo-");
  async function openMap() {
    setActionError("");
    try {
      await Linking.openURL(mapsUrl);
    } catch {
      setActionError("Could not open Maps on this device.");
    }
  }
  async function share() {
    setActionError("");
    try {
      await Share.share({
        message: `${r.venue.name}${demo ? " (demo venue)" : ""}${r.venue.address ? ` · ${r.venue.address}` : ""}\n${mapsUrl}`,
        title: r.venue.name,
      });
    } catch {
      setActionError("Sharing is unavailable on this device.");
    }
  }
  return (
    <Panel>
      <View style={card.top}>
        <View style={{ flex: 1, gap: 9 }}>
          <Label>
            {String(index + 1).padStart(2, "0")} /{" "}
            {(r.venue.categories[0] || "LOCAL FAVORITE")
              .replace(/_/g, " ")
              .toUpperCase()}{" "}
            · {"$".repeat(r.venue.price_level || 1)}
          </Label>
          <Text style={card.name}>{r.venue.name}</Text>
          <Text style={s.caption}>{r.venue.address}</Text>
        </View>
        <PlasmaPressable
          accessibilityRole="button"
          accessibilityLabel={`${saved ? "Unsave" : "Save"} ${r.venue.name}`}
          accessibilityState={{ selected: saved, disabled: !storageReady }}
          selected={saved}
          disabled={!storageReady}
          onPress={() => toggleSaved(r.venue.id)}
          radius={23}
          style={{ width: 46, height: 46 }}
        >
          <Icon
            name="heart"
            size={19}
            color={saved ? colors.lime : colors.muted}
          />
        </PlasmaPressable>
      </View>
      <View style={card.stats}>
        <View style={s.row}>
          <Icon name="star" size={13} />
          <Text style={card.stat}>
            {r.venue.rating?.toFixed(1) || "—"}{" "}
            <Text style={{ color: colors.dim }}>
              ({r.venue.review_count?.toLocaleString() || "—"})
            </Text>
          </Text>
        </View>
        <View style={s.row}>
          <Icon name="map-pin" size={13} color={colors.muted} />
          <Text style={card.stat}>
            {r.venue.walk_min} min walk
            {r.venue.walk_estimate?.label ? " · approx." : ""}
          </Text>
        </View>
      </View>
      <View style={card.transit}>
        <View style={[s.row, { flex: 1 }]}>
          <Icon name="navigation" size={13} color={colors.muted} />
          <Text style={s.caption}>{transit}</Text>
        </View>
        <Text style={card.open}>OPEN AT PLAN TIME</Text>
      </View>
      <View style={card.scoreRow}>
        <PlasmaSurface radius={18} contentStyle={card.fitBadge}>
          <Text style={card.score}>{score}</Text>
          <Text style={card.fit}>FIT SCORE</Text>
        </PlasmaSurface>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={s.caption}>A fit for your night</Text>
            <Icon name="arrow-up-right" size={14} />
          </View>
          <View style={card.track}>
            <LinearGradient
              colors={["#7ebfa5", "#c6f36a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[card.fill, { width: `${score}%` }]}
            />
          </View>
        </View>
      </View>
      <PlasmaPressable
        accessibilityRole="button"
        accessibilityLabel={`Why ${r.venue.name}?`}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
        radius={16}
      >
        <View
          style={[s.row, { justifyContent: "space-between", width: "100%" }]}
        >
          <Text style={s.caption}>Why this place?</Text>
          <Icon
            name={expanded ? "minus" : "plus"}
            size={16}
            color={colors.muted}
          />
        </View>
      </PlasmaPressable>
      {expanded && (
        <PlasmaReveal>
          <View style={card.breakdown}>
            <Text style={s.body}>{r.explanation}</Text>
            {!!r.reach_explanation && (
              <Text style={s.caption}>{r.reach_explanation}</Text>
            )}
            {Object.entries(r.score.components).map(([name, component]) => (
              <View style={{ gap: 7 }} key={name}>
                <View style={card.component}>
                  <Text style={card.componentName}>
                    {name}
                    {component.label ? ` · ${component.label}` : ""}
                  </Text>
                  <Text style={s.caption}>
                    {Math.round(component.value * 100)} ×{" "}
                    {component.weight.toFixed(2)}
                  </Text>
                </View>
                <View style={card.track}>
                  <View
                    style={[
                      card.fill,
                      {
                        width: `${Math.max(0, Math.min(100, component.value * 100))}%`,
                        backgroundColor: "#b7d88b",
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </PlasmaReveal>
      )}
      <View style={s.row}>
        <PlasmaPressable
          accessibilityRole="link"
          accessibilityLabel={`Walking directions to ${r.venue.name}`}
          style={{ flex: 1 }}
          onPress={() => {
            void openMap();
          }}
        >
          <View style={s.row}>
            <Icon name="map" size={15} />
            <Text style={card.action}>Get directions</Text>
            <Icon name="arrow-up-right" size={14} />
          </View>
        </PlasmaPressable>
        <PlasmaPressable
          accessibilityRole="button"
          accessibilityLabel={`Share ${r.venue.name}`}
          onPress={() => {
            void share();
          }}
          style={{ width: 46 }}
        >
          <Icon name="share-2" size={16} color={colors.muted} />
        </PlasmaPressable>
      </View>
      {!!actionError && <Notice>{actionError}</Notice>}
      <View>
        {(r.venue.attributions || []).map((attribution, i) =>
          attribution.url ? (
            <ExternalLink key={i} url={attribution.url}>
              {attribution.text}
            </ExternalLink>
          ) : (
            <Text key={i} style={card.attribution}>
              {attribution.text}
            </Text>
          ),
        )}
      </View>
    </Panel>
  );
}
const card = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  name: {
    fontSize: 23,
    fontWeight: "500",
    letterSpacing: -0.6,
    color: colors.text,
    lineHeight: 29,
  },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  stat: { color: colors.text, fontSize: 12 },
  transit: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  open: { color: colors.lime, fontFamily: mono, fontSize: 8 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  fitBadge: { padding: 12, gap: 3, alignItems: "center", minWidth: 70 },
  score: { fontSize: 24, fontFamily: mono, color: colors.lime },
  fit: {
    fontSize: 7,
    fontFamily: mono,
    letterSpacing: 1.2,
    color: colors.muted,
  },
  track: {
    height: 4,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "#769d6840",
  },
  fill: { height: "100%", borderRadius: 3 },
  breakdown: { paddingTop: 4, paddingBottom: 4, gap: 16 },
  component: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  componentName: {
    color: colors.muted,
    textTransform: "capitalize",
    fontSize: 12,
  },
  attribution: { color: colors.muted, fontSize: 10, lineHeight: 16 },
  action: { color: colors.text, fontSize: 12, fontWeight: "500" },
});
