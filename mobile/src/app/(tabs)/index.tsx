import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { WalkingSlider } from "../../components/WalkingSlider";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BOSTON, usePlanner } from "../../lib/planner";
import {
  Button,
  colors,
  Header,
  Icon,
  Label,
  mono,
  Notice,
  Panel,
  s,
  serif,
} from "../../components/ui";
import {
  PlasmaPressable,
  PlasmaBackground,
  PlasmaSegments,
  PlasmaSurface,
  PlasmaSwitch,
} from "../../components/plasma";
import { VenueCard } from "../../components/VenueCard";

const budgets = ["$", "$$", "$$$"] as const;
const vibes = [
  { text: "Coffee", icon: "coffee", query: "coffee" },
  { text: "Noodles", icon: "sun", query: "ramen" },
  { text: "A little fresh air", icon: "wind", query: "park" },
] as const;
export default function TonightScreen() {
  const p = usePlanner();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [focused, setFocused] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const update = (values: Partial<typeof p.filters>) =>
    p.setFilters((current) => ({ ...current, ...values }));
  const find = () => {
    Keyboard.dismiss();
    void p.search(p.filters, p.location);
  };
  async function locate() {
    setLocating(true);
    setLocationError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationError(
          "Location access is off. You can still choose Downtown Boston.",
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      p.setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      p.setLocationLabel("Your current location");
    } catch {
      setLocationError(
        "Could not find your location. Try again or use Downtown Boston.",
      );
    } finally {
      setLocating(false);
    }
  }
  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <PlasmaBackground />
      <Header />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
          refreshControl={
            <RefreshControl
              refreshing={p.loading}
              onRefresh={find}
              tintColor={colors.lime}
            />
          }
        >
          <View style={styles.hero}>
            <View style={s.row}>
              <View style={styles.pip} />
              <Label>BOSTON, MA / AFTER DARK</Label>
            </View>
            <Text accessibilityRole="header" style={styles.heroTitle}>
              Boston after{"\n"}
              <Text style={styles.italic}>hours.</Text>
            </Text>
            <View style={styles.heroHeading}>
              <Text style={[s.body, { flex: 1 }]}>
                Good plans start with a place.{"\n"}Great ones get you home.
              </Text>
              <PlasmaSurface radius={36} contentStyle={styles.orbit}>
                <Icon name="moon" size={27} />
              </PlasmaSurface>
            </View>
          </View>
          <Panel>
            <View style={styles.heading}>
              <View style={{ gap: 5 }}>
                <Label>01 / YOUR NIGHT STARTS HERE</Label>
                <Text style={styles.panelTitle}>Find your somewhere.</Text>
              </View>
              <Icon name="sun" size={22} />
            </View>
            <View style={{ gap: 10 }}>
              <Label>WHAT ARE YOU IN THE MOOD FOR?</Label>
              <View
                style={[
                  styles.inputWrap,
                  focused && {
                    borderColor: "#c6f36a99",
                    backgroundColor: "#27472b80",
                  },
                ]}
              >
                <Icon name="search" size={17} color={colors.muted} />
                <TextInput
                  accessibilityLabel="The vibe"
                  placeholder="A place, a craving, a little adventure…"
                  placeholderTextColor={colors.dim}
                  value={p.filters.text}
                  onChangeText={(text) => update({ text })}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onSubmitEditing={find}
                  maxLength={300}
                  returnKeyType="search"
                  style={styles.input}
                />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 7 }}
              >
                {vibes.map((vibe) => (
                  <PlasmaPressable
                    key={vibe.query}
                    accessibilityRole="button"
                    accessibilityLabel={`Vibe ${vibe.text}`}
                    selected={p.filters.text === vibe.query}
                    onPress={() =>
                      update({
                        text: p.filters.text === vibe.query ? "" : vibe.query,
                      })
                    }
                    style={{ minHeight: 38 }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Icon name={vibe.icon} size={12} color={colors.muted} />
                      <Text style={s.caption}>{vibe.text}</Text>
                    </View>
                  </PlasmaPressable>
                ))}
              </ScrollView>
            </View>
            <View style={{ gap: 10 }}>
              <Label>WHEN / YOUR LOCAL TIME</Label>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {[1, 2, 4, 8, 12].map((hours) => (
                  <PlasmaPressable
                    key={hours}
                    accessibilityRole="button"
                    accessibilityState={{ selected: p.filters.hours === hours }}
                    onPress={() => update({ hours })}
                    selected={p.filters.hours === hours}
                    radius={18}
                    style={{ minWidth: 94 }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        p.filters.hours === hours && { color: colors.lime },
                      ]}
                    >
                      {hours === 1 ? "In an hour" : `In ${hours} hours`}
                    </Text>
                    <Text style={styles.chipTime}>
                      {new Date(clock + hours * 3600000).toLocaleTimeString(
                        [],
                        { hour: "numeric", minute: "2-digit" },
                      )}
                    </Text>
                  </PlasmaPressable>
                ))}
              </ScrollView>
            </View>
            <View style={{ gap: 9 }}>
              <Label>A LITTLE OR A LITTLE EXTRA?</Label>
              <PlasmaSegments
                label="Budget"
                value={p.filters.budget}
                options={budgets}
                onValueChange={(budget) => update({ budget })}
              />
            </View>
            <View style={{ gap: 5 }}>
              <View style={styles.heading}>
                <Label>HOW FAR ON FOOT</Label>
                <Text style={styles.walkValue}>
                  {p.filters.walk}
                  <Text style={s.caption}> MIN</Text>
                </Text>
              </View>
              <WalkingSlider
                value={p.filters.walk}
                onChange={(walk) => update({ walk })}
              />
              <View style={styles.heading}>
                <Text style={styles.rangeLabel}>SHORT STROLL</Text>
                <Text style={styles.rangeLabel}>LONGER WANDER</Text>
              </View>
            </View>
            <View style={styles.rain}>
              <View style={s.row}>
                <Icon name="cloud-rain" size={17} color={colors.muted} />
                <View>
                  <Text style={styles.chipText}>Plan for rain</Text>
                  <Text style={s.caption}>Prefer an indoor kind of night</Text>
                </View>
              </View>
              <PlasmaSwitch
                value={p.filters.rain}
                onValueChange={(rain) => update({ rain })}
                label="Rain override for next search"
              />
            </View>
            <View style={styles.location}>
              <Icon name="map-pin" size={15} />
              <Text style={[s.caption, { flex: 1 }]}>{p.locationLabel}</Text>
              <PlasmaPressable
                accessibilityRole="button"
                accessibilityLabel="Use current location"
                disabled={locating}
                onPress={() => {
                  void locate();
                }}
                radius={23}
              >
                {locating ? (
                  <ActivityIndicator color={colors.lime} />
                ) : (
                  <Icon name="crosshair" size={17} />
                )}
              </PlasmaPressable>
            </View>
            {p.locationLabel !== "Downtown Boston" && (
              <PlasmaPressable
                accessibilityRole="button"
                onPress={() => {
                  p.setLocation(BOSTON);
                  p.setLocationLabel("Downtown Boston");
                }}
              >
                <Text style={s.link}>Use Downtown Boston</Text>
              </PlasmaPressable>
            )}
            {!!locationError && <Notice>{locationError}</Notice>}
            <Button
              title={p.loading ? "Finding your night…" : "Find my night"}
              onPress={find}
              disabled={p.loading}
            />
          </Panel>
          <View style={[styles.heading, { marginTop: 10 }]}>
            <View style={{ gap: 7 }}>
              <Label>02 / CURATED FOR YOUR PLAN</Label>
              <Text style={styles.panelTitle}>The night is yours.</Text>
            </View>
            <PlasmaSurface radius={23} contentStyle={{ padding: 12, gap: 0 }}>
              <Icon name={p.filters.rain ? "cloud-rain" : "moon"} size={18} />
            </PlasmaSurface>
          </View>
          {!!p.error && (
            <Notice>
              {p.error}
              {p.result ? " Showing your previous results below." : ""}
            </Notice>
          )}
          {!!p.storageError && <Notice>{p.storageError}</Notice>}
          {p.loading && !p.result && (
            <Panel>
              <ActivityIndicator color={colors.lime} />
              <Text style={s.body}>
                Checking places and the way home. The server can take a minute
                to wake up.
              </Text>
            </Panel>
          )}
          {p.result && (
            <View style={styles.resultMeta}>
              <View style={styles.pip} />
              <Text style={[s.caption, { flex: 1 }]}>
                {p.result.recommendations.length} places · Updated{" "}
                {new Date(p.result.generated_at).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {p.result.weather.temperature_f != null
                  ? ` · ${Math.round(p.result.weather.temperature_f)}°F`
                  : ""}
                {p.result.sources_used.some(
                  (source) => source.status === "demo",
                )
                  ? " · Demo data"
                  : ""}
              </Text>
            </View>
          )}
          {p.result?.empty_message && (
            <Panel>
              <Icon name="moon" />
              <Text style={s.body}>{p.result.empty_message}</Text>
            </Panel>
          )}
          {p.result?.recommendations.map((r, index) => (
            <VenueCard key={r.venue.id} recommendation={r} index={index} />
          ))}
          <Text style={[s.label, { textAlign: "center", marginTop: 10 }]}>
            A LITTLE MORE CITY. A LITTLE MORE YOU. ↗
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  hero: { paddingTop: 22, paddingBottom: 5, gap: 17 },
  pip: { height: 5, width: 5, borderRadius: 3, backgroundColor: colors.lime },
  heroHeading: { gap: 12, flexDirection: "row", alignItems: "flex-end" },
  heroTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -2.7,
    fontWeight: "500",
  },
  italic: { fontFamily: serif, fontStyle: "italic", color: colors.lime },
  orbit: {
    width: 65,
    height: 65,
    padding: 0,
    gap: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  panelTitle: { color: colors.text, fontSize: 23, letterSpacing: -0.8 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#aad5be30",
    borderRadius: 16,
    paddingHorizontal: 13,
    backgroundColor: "#071e1670",
  },
  input: { flex: 1, minHeight: 52, color: colors.text, fontSize: 13 },
  chipText: { color: colors.text, fontSize: 13, fontWeight: "500" },
  chipTime: { color: colors.muted, fontSize: 10, marginTop: 6 },
  walkValue: { fontFamily: mono, fontSize: 21, color: colors.lime },
  rangeLabel: {
    fontFamily: mono,
    color: colors.dim,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  rain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingTop: 2,
  },
  resultMeta: { flexDirection: "row", alignItems: "center", gap: 9 },
});
