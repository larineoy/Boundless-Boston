import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePlanner } from "../lib/planner";
import type { Recommendation } from "../lib/types";
import { colors, ExternalLink, Icon, Label, mono, Panel, s } from "./ui";

export function VenueCard({
  recommendation: r,
  index,
}: {
  recommendation: Recommendation;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
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
  return (
    <Panel>
      <View style={card.top}>
        <View style={{ flex: 1, gap: 7 }}>
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${saved ? "Unsave" : "Save"} ${r.venue.name}`}
          accessibilityState={{ selected: saved, disabled: !storageReady }}
          disabled={!storageReady}
          onPress={() => toggleSaved(r.venue.id)}
          style={s.iconButton}
        >
          <Icon name="heart" color={saved ? colors.lime : colors.dim} />
        </Pressable>
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
          <Icon name="map-pin" size={13} />
          <Text style={card.stat}>
            {r.venue.walk_min} min walk
            {r.venue.walk_estimate?.label ? " · approx." : ""}
          </Text>
        </View>
      </View>
      <View style={s.row}>
        <Icon name="navigation" size={13} color={colors.muted} />
        <Text style={s.caption}>{transit}</Text>
        <Text style={card.open}>OPEN AT PLAN TIME</Text>
      </View>
      <View style={card.scoreRow}>
        <Text style={card.score}>
          {score}
          <Text style={card.fit}> FIT</Text>
        </Text>
        <View style={card.track}>
          <View style={[card.fill, { width: `${score}%` }]} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(!expanded)}
          style={card.why}
        >
          <Text style={s.caption}>Why this?</Text>
          <Icon
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={colors.muted}
          />
        </Pressable>
      </View>
      {expanded && (
        <View style={card.breakdown}>
          <Text style={s.body}>{r.explanation}</Text>
          {!!r.reach_explanation && (
            <Text style={s.caption}>{r.reach_explanation}</Text>
          )}
          {Object.entries(r.score.components).map(([name, component]) => (
            <View style={card.component} key={name}>
              <Text style={card.componentName}>
                {name}
                {component.label ? ` · ${component.label}` : ""}
              </Text>
              <Text style={s.caption}>
                {Math.round(component.value * 100)} ×{" "}
                {component.weight.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  top: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  name: {
    fontSize: 21,
    fontWeight: "500",
    letterSpacing: -0.5,
    color: colors.text,
  },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  stat: { color: colors.text, fontSize: 11 },
  open: {
    color: colors.lime,
    fontFamily: mono,
    fontSize: 7,
    marginLeft: "auto",
    flexShrink: 1,
  },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  score: { fontSize: 20, fontFamily: mono, color: colors.lime },
  fit: { fontSize: 9 },
  track: { flex: 1, height: 3, backgroundColor: colors.line },
  fill: { height: 3, backgroundColor: colors.lime },
  why: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44 },
  breakdown: {
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingTop: 15,
    gap: 12,
  },
  component: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  componentName: {
    color: colors.muted,
    textTransform: "capitalize",
    fontSize: 12,
  },
  attribution: { color: colors.muted, fontSize: 10, lineHeight: 16 },
});
