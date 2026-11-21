import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Header,
  Icon,
  Label,
  Notice,
  Panel,
  s,
} from "../../components/ui";
import { VenueCard } from "../../components/VenueCard";
import { usePlanner } from "../../lib/planner";

export default function SavedScreen() {
  const { savedIds, sessionPlaces, storageError, storageReady, toggleSaved } =
    usePlanner();
  const available = savedIds.filter((id) => sessionPlaces[id]);
  const missing = savedIds.filter((id) => !sessionPlaces[id]);
  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <Header />
      <ScrollView contentContainerStyle={s.content}>
        <View style={{ gap: 10, paddingTop: 28 }}>
          <Label>KEEP A FEW POSSIBILITIES</Label>
          <Text style={s.title}>For a good night.</Text>
          <Text style={s.body}>Your saved places, all in one spot.</Text>
        </View>
        {!!storageError && <Notice>{storageError}</Notice>}
        {!storageReady && <Text style={s.body}>Restoring saved places…</Text>}
        {storageReady && !savedIds.length && (
          <Panel>
            <Icon name="heart" size={30} />
            <Text style={s.title}>Room for a favorite.</Text>
            <Text style={s.body}>
              Tap the heart on a place in your shortlist to keep it here.
            </Text>
            <Button
              title="Find your somewhere"
              onPress={() => router.navigate("/")}
            />
          </Panel>
        )}
        {!!available.length && (
          <Text style={s.caption}>
            From searches this session. Search again to check hours, fit, and
            your way home before heading out.
          </Text>
        )}
        {available.map((id, index) => (
          <VenueCard
            key={id}
            recommendation={sessionPlaces[id]}
            index={index}
          />
        ))}
        {!!missing.length && (
          <Panel>
            <Label>
              {missing.length} SAVED {missing.length === 1 ? "PLACE" : "PLACES"}{" "}
              TO REDISCOVER
            </Label>
            <Text style={s.body}>
              We keep only place IDs on your device. Run a new search to see
              fresh details for matching saved places.
            </Text>
            <Button title="Search again" onPress={() => router.navigate("/")} />
            <Button
              title="Remove unavailable saves"
              secondary
              icon="trash-2"
              onPress={() => missing.forEach(toggleSaved)}
            />
          </Panel>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
