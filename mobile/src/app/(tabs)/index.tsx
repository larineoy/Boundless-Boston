import { useEffect, useState } from "react";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { VenueCard } from "../../components/VenueCard";

export default function TonightScreen() {
  const p = usePlanner();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
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
          "Location access is off. You can still plan from Downtown Boston.",
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
      <Header />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
            <Text style={[s.body, { maxWidth: 280 }]}>
              Good plans start with a place.{"\n"}Great ones get you home.
            </Text>
            <View style={styles.moon}>
              <Icon name="moon" size={28} />
            </View>
          </View>
          <Panel>
            <View style={styles.heading}>
              <View style={{ gap: 5 }}>
                <Label>01 — MAKE IT A NIGHT</Label>
                <Text style={styles.panelTitle}>Find your somewhere.</Text>
              </View>
              <Icon name="sun" />
            </View>
            <View style={{ gap: 8 }}>
              <Label>THE VIBE</Label>
              <View style={styles.inputWrap}>
                <Icon name="search" size={16} color={colors.muted} />
                <TextInput
                  accessibilityLabel="The vibe"
                  placeholder="ramen, coffee, somewhere cozy…"
                  placeholderTextColor={colors.dim}
                  value={p.filters.text}
                  onChangeText={(text) => update({ text })}
                  onSubmitEditing={find}
                  maxLength={300}
                  returnKeyType="search"
                  style={styles.input}
                />
              </View>
            </View>
            <View style={{ gap: 9 }}>
              <Label>WHEN · YOUR LOCAL TIME</Label>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {[1, 2, 4, 8, 12].map((hours) => (
                  <Pressable
                    key={hours}
                    accessibilityRole="button"
                    accessibilityState={{ selected: p.filters.hours === hours }}
                    onPress={() => update({ hours })}
                    style={[
                      styles.chip,
                      p.filters.hours === hours && styles.selected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        p.filters.hours === hours && styles.selectedText,
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
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={{ gap: 9 }}>
              <Label>SPEND</Label>
              <View style={styles.options}>
                {(["$", "$$", "$$$"] as const).map((budget) => (
                  <Pressable
                    key={budget}
                    accessibilityRole="button"
                    accessibilityLabel={`Budget ${budget}`}
                    accessibilityState={{
                      selected: p.filters.budget === budget,
                    }}
                    onPress={() => update({ budget })}
                    style={[
                      styles.option,
                      p.filters.budget === budget && styles.selected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        p.filters.budget === budget && styles.selectedText,
                      ]}
                    >
                      {budget}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.walk}>
              <View style={{ gap: 4 }}>
                <Label>HOW FAR ON FOOT</Label>
                <Text style={styles.walkValue}>
                  {p.filters.walk} <Text style={s.caption}>min</Text>
                </Text>
              </View>
              <View style={s.row}>
                {([-5, 5] as const).map((delta) => (
                  <Pressable
                    key={delta}
                    accessibilityRole="button"
                    accessibilityLabel={
                      delta < 0
                        ? "Walk five minutes less"
                        : "Walk five minutes more"
                    }
                    disabled={
                      p.filters.walk + delta < 5 || p.filters.walk + delta > 45
                    }
                    onPress={() => update({ walk: p.filters.walk + delta })}
                    style={[
                      styles.step,
                      (p.filters.walk + delta < 5 ||
                        p.filters.walk + delta > 45) && { opacity: 0.3 },
                    ]}
                  >
                    <Icon name={delta < 0 ? "minus" : "plus"} size={18} />
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.location}>
              <Icon name="map-pin" size={15} />
              <Text style={[s.caption, { flex: 1 }]}>{p.locationLabel}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Use current location"
                disabled={locating}
                onPress={() => {
                  void locate();
                }}
                style={s.iconButton}
              >
                {locating ? (
                  <ActivityIndicator color={colors.lime} />
                ) : (
                  <Icon name="crosshair" size={18} />
                )}
              </Pressable>
            </View>
            {p.locationLabel !== "Downtown Boston" && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  p.setLocation(BOSTON);
                  p.setLocationLabel("Downtown Boston");
                }}
              >
                <Text style={s.link}>Use Downtown Boston</Text>
              </Pressable>
            )}
            {!!locationError && <Notice>{locationError}</Notice>}
            <Button
              title={p.loading ? "Finding your night…" : "Find my night"}
              onPress={find}
              disabled={p.loading}
            />
          </Panel>
          <View style={[styles.heading, { marginTop: 16 }]}>
            <View style={{ gap: 7 }}>
              <Label>02 — YOUR SHORTLIST</Label>
              <Text style={styles.panelTitle}>The night is yours.</Text>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="Rain override for next search"
              accessibilityState={{ checked: p.filters.rain }}
              onPress={() => update({ rain: !p.filters.rain })}
              style={styles.weather}
            >
              <Icon name={p.filters.rain ? "cloud-rain" : "moon"} size={15} />
              <Text style={s.caption}>
                {p.filters.rain ? "Rain check" : "Forecast"}
              </Text>
            </Pressable>
          </View>
          {p.filters.rain && (
            <Text style={s.caption}>
              Rain override will apply when you find your night.
            </Text>
          )}
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
            <Text style={s.caption}>
              {p.result.recommendations.length} places · Updated{" "}
              {new Date(p.result.generated_at).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
              {p.result.weather.temperature_f != null
                ? ` · ${Math.round(p.result.weather.temperature_f)}°F`
                : ""}
              {p.result.sources_used.some((source) => source.status === "demo")
                ? " · Demo data"
                : ""}
            </Text>
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
          <Text style={[s.label, { textAlign: "center", marginTop: 12 }]}>
            MADE FOR THE WAY HOME ↘
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  hero: { paddingTop: 30, paddingBottom: 12, gap: 18 },
  pip: { height: 5, width: 5, borderRadius: 3, backgroundColor: colors.lime },
  heroTitle: {
    color: colors.text,
    fontSize: 59,
    lineHeight: 62,
    letterSpacing: -3,
    fontWeight: "500",
  },
  italic: { fontFamily: serif, fontStyle: "italic", color: colors.lime },
  moon: {
    position: "absolute",
    top: 140,
    right: 4,
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "#4b6138",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#202b1c",
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  panelTitle: { color: colors.text, fontSize: 23, letterSpacing: -0.7 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "#526047",
  },
  input: { flex: 1, minHeight: 48, color: colors.text, fontSize: 14 },
  options: { flexDirection: "row", gap: 8 },
  option: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
  },
  chip: {
    minWidth: 94,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 9,
    gap: 5,
  },
  selected: { backgroundColor: "#303e24", borderColor: "#829d51" },
  selectedText: { color: colors.lime },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: "500" },
  chipTime: { color: colors.muted, fontSize: 10 },
  walk: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 3,
  },
  walkValue: { fontFamily: mono, fontSize: 25, color: colors.lime },
  step: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingTop: 8,
  },
  weather: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    minHeight: 44,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 22,
  },
});
