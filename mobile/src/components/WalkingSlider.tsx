import Slider from "@react-native-community/slider";
import { colors } from "./ui";
import { selectionFeedback } from "./plasma";

export function WalkingSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Slider
      accessibilityLabel="Maximum walking minutes"
      accessibilityValue={{
        min: 5,
        max: 45,
        now: value,
        text: `${value} minutes`,
      }}
      minimumValue={5}
      maximumValue={45}
      step={5}
      value={value}
      onValueChange={onChange}
      onSlidingComplete={selectionFeedback}
      minimumTrackTintColor={colors.lime}
      maximumTrackTintColor="#4d6a58"
      thumbTintColor="#daffae"
      style={{ width: "100%", height: 36 }}
    />
  );
}
