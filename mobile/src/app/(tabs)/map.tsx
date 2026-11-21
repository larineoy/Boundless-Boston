import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AreaMap from "../../components/AreaMap";
import { Button, Header, Icon, Label, Panel, s } from "../../components/ui";
import { usePlanner } from "../../lib/planner";

export default function MapScreen() {
  const { location, locationLabel } = usePlanner();
  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <Header />
      <ScrollView contentContainerStyle={s.content}>
        <View style={{ gap: 10, paddingTop: 28 }}>
          <Label>EXPLORE YOUR SURROUNDINGS</Label>
          <Text style={s.title}>Get to know the block.</Text>
          <Text style={s.body}>
            A little context for wherever the night takes you.
          </Text>
        </View>
        <View style={s.row}>
          <Icon name="map-pin" size={15} />
          <Text style={s.body}>{locationLabel}</Text>
        </View>
        <AreaMap location={location} />
        <Text style={s.caption}>
          Area view · The circle shows 700 meters around your starting point.
          Walking times and transit availability come from your shortlist.
        </Text>
        <Panel>
          <Icon name="coffee" />
          <Text style={s.title}>Neighborhood notes</Text>
          <Text style={s.body}>
            Recent city service requests, business licenses, and useful city
            contacts, with the source details.
          </Text>
          <Button
            title="Get to know the block"
            secondary
            onPress={() => router.push("/sources")}
          />
        </Panel>
      </ScrollView>
    </SafeAreaView>
  );
}
