import { colors } from "./ui";

// Use the browser's range input for keyboard and screen-reader support.
export function WalkingSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="range"
      aria-label="Maximum walking minutes"
      aria-valuetext={`${value} minutes`}
      min={5}
      max={45}
      step={5}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{
        width: "100%",
        height: 36,
        margin: 0,
        accentColor: colors.lime,
        cursor: "pointer",
      }}
    />
  );
}
