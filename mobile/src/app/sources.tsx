import { useEffect, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  colors,
  ExternalLink,
  Icon,
  Label,
  Notice,
  Panel,
  s,
} from "../components/ui";
import { getNeighborhood } from "../lib/api";
import { SOURCE_NAMES, usePlanner } from "../lib/planner";
import type { Neighborhood } from "../lib/types";
import { PlasmaBackground, PlasmaPressable } from "../components/plasma";

export default function SourcesScreen() {
  const { sources, mergeSources, location } = usePlanner();
  const [data, setData] = useState<Neighborhood | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void getNeighborhood(location)
      .then((result) => {
        if (active) {
          setData(result);
          mergeSources(result.sources_used);
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Neighborhood data is unavailable.",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [location, mergeSources, attempt]);
  return (
    <SafeAreaView style={s.screen}>
      <PlasmaBackground />
      <View style={[s.header, { justifyContent: "space-between" }]}>
        <Label>TRUST, IN THE DETAILS</Label>
        <PlasmaPressable
          accessibilityRole="button"
          accessibilityLabel="Close source details"
          onPress={() => router.back()}
          style={s.iconButton}
        >
          <Icon name="x" color={colors.text} />
        </PlasmaPressable>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={{ gap: 12, paddingTop: 24 }}>
          <Text style={s.title}>Where this comes from.</Text>
          <Text style={s.body}>
            Fit scores combine venue quality, momentum, reachability, events,
            and weather. Each source reports whether its data is live, cached,
            demo, disabled, or unavailable.
          </Text>
        </View>
        <Panel>
          <Label>THE SIGNAL CHECK</Label>
          {Object.entries(SOURCE_NAMES).map(([key, name]) => {
            const source = sources.find((item) => item.source === key);
            return (
              <View key={key} style={{ gap: 6 }}>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Text style={{ color: colors.text, fontSize: 14 }}>
                    {name}
                  </Text>
                  <Text
                    style={{
                      color:
                        source?.status === "live" ? colors.lime : "#d5bd82",
                      fontSize: 11,
                    }}
                  >
                    {source?.status || "unknown"}
                  </Text>
                </View>
                {!!source?.detail && (
                  <Text style={s.caption}>{source.detail}</Text>
                )}
                {!!(source?.observed_at || source?.checked_at) && (
                  <Text style={s.caption}>
                    Checked{" "}
                    {new Date(
                      (source.observed_at || source.checked_at)!,
                    ).toLocaleString()}
                  </Text>
                )}
              </View>
            );
          })}
        </Panel>
        <View style={{ gap: 8 }}>
          <Label>NEIGHBORHOOD SNAPSHOT · WITHIN 1.5 KM</Label>
          <Text style={s.title}>Know your surroundings.</Text>
          {data?.sources_used.some((item) => item.status === "demo") && (
            <Notice>
              Demo neighborhood figures. These are synthetic examples.
            </Notice>
          )}
        </View>
        {busy && (
          <Panel>
            <ActivityIndicator color={colors.lime} />
            <Text style={s.body}>Checking Boston Open Data…</Text>
          </Panel>
        )}
        {!!error && (
          <>
            <Notice>{error}</Notice>
            <Button
              title="Try again"
              onPress={() => {
                setBusy(true);
                setError("");
                setData(null);
                setAttempt((value) => value + 1);
              }}
            />
          </>
        )}
        {!busy && data && (
          <>
            <Panel>
              <Label>CITY SERVICE REQUESTS</Label>
              {data["311"] ? (
                <>
                  <Text style={s.caption}>
                    {data["311"].period_start} to {data["311"].period_end}
                  </Text>
                  {data["311"].top_categories.map((item) => (
                    <View
                      key={item.category}
                      style={[s.row, { justifyContent: "space-between" }]}
                    >
                      <Text style={[s.body, { flex: 1 }]}>{item.category}</Text>
                      <Text style={{ color: colors.lime }}>{item.count}</Text>
                    </View>
                  ))}
                  {!data["311"].top_categories.length && (
                    <Text style={s.body}>No requests in this snapshot.</Text>
                  )}
                </>
              ) : (
                <Text style={s.body}>
                  City service data is unavailable. No figures are being
                  substituted.
                </Text>
              )}
            </Panel>
            <Panel>
              <Label>
                {(
                  data.business_licenses_source || "BUSINESS LICENSES"
                ).toUpperCase()}
              </Label>
              {data.business_licenses === null ? (
                <Text style={s.body}>
                  Business license data is unavailable.
                </Text>
              ) : data.business_licenses.length ? (
                data.business_licenses.slice(0, 5).map((item, index) => (
                  <View key={index}>
                    <Text style={s.body}>{item.name}</Text>
                    <Text style={s.caption}>
                      {item.issued_at}
                      {item.address ? ` · ${item.address}` : ""}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={s.body}>No licenses in this snapshot.</Text>
              )}
            </Panel>
            {!!data.city_contacts?.length && (
              <Panel>
                <Label>USEFUL CITY CONTACTS</Label>
                {data.city_contacts.map((contact) => (
                  <View key={contact.name} style={{ gap: 6 }}>
                    <ExternalLink url={contact.url}>
                      {contact.name} ↗
                    </ExternalLink>
                    <Text style={s.caption}>{contact.service}</Text>
                    <ExternalLink url={`tel:${contact.phone}`}>
                      Call {contact.phone}
                    </ExternalLink>
                  </View>
                ))}
              </Panel>
            )}
          </>
        )}
        <Panel>
          <Label>WITH THANKS TO</Label>
          <ExternalLink url="https://open-meteo.com/">
            Weather data by Open-Meteo
          </ExternalLink>
          <ExternalLink url="https://www.mbta.com/developers/v3-api">
            MBTA V3 API
          </ExternalLink>
          <ExternalLink url="https://data.boston.gov/">
            City of Boston Open Data
          </ExternalLink>
          <Text style={s.caption}>
            Venue provider credits are shown alongside each place. Credentials
            stay on the server.
          </Text>
        </Panel>
      </ScrollView>
    </SafeAreaView>
  );
}
