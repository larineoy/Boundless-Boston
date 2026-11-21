import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

// Native interpretation of Crux Garden's aurora material. No DOM, WebView,
// full-screen shader loop, or per-frame React state updates are required.
export const plasma = {
  bg: "#091713",
  tint: "#142d24",
  lime: "#c6f36a",
  mint: "#a9e6c8",
  text: "#f1f6ed",
  muted: "#b1c8b9",
  line: "#9ac7ab36",
};
const MaterialContext = createContext({
  reducedMotion: true,
  reducedTransparency: true,
});
// React Native Web does not yet export RN's useAnimatedValue hook.
function useMotionValue(initial: number) {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}
export function PlasmaProvider({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(true);
  const [reducedTransparency, setReducedTransparency] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReducedMotion(value);
      })
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );
    if (Platform.OS === "ios") {
      void AccessibilityInfo.isReduceTransparencyEnabled()
        .then((value) => {
          if (active) setReducedTransparency(value);
        })
        .catch(() => {});
    } else {
      void Promise.resolve().then(() => {
        if (active) setReducedTransparency(false);
      });
    }
    const transparency =
      Platform.OS === "ios"
        ? AccessibilityInfo.addEventListener(
            "reduceTransparencyChanged",
            setReducedTransparency,
          )
        : undefined;
    return () => {
      active = false;
      motion.remove();
      transparency?.remove();
    };
  }, []);
  return (
    <MaterialContext.Provider value={{ reducedMotion, reducedTransparency }}>
      {children}
    </MaterialContext.Provider>
  );
}
export const usePlasma = () => useContext(MaterialContext);
export function PlasmaReveal({ children }: { children: ReactNode }) {
  const { reducedMotion } = usePlasma();
  const progress = useMotionValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.spring(progress, {
      toValue: 1,
      stiffness: 280,
      damping: 30,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reducedMotion]);
  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [6, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
export function selectionFeedback() {
  if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
}

export function PlasmaBackground() {
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
    >
      <LinearGradient
        colors={["#163c2e", "#10261f", "#081511", "#0c201c"]}
        locations={[0, 0.35, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["#9dde6530", "#55c5a014", "#55c5a000"]}
        style={material.aurora}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <LinearGradient
        colors={["#79a7e500", "#79a7e51c", "#79a7e500"]}
        style={material.tidal}
      />
    </View>
  );
}

export function PlasmaSurface({
  children,
  style,
  contentStyle,
  radius = 26,
  elevated = false,
  blur = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  elevated?: boolean;
  blur?: boolean;
}) {
  const { reducedTransparency } = usePlasma();
  return (
    <View
      style={[
        material.shadow,
        elevated && material.elevated,
        { borderRadius: radius },
        style,
      ]}
    >
      <View style={[material.surface, { borderRadius: radius }]}>
        {blur && !reducedTransparency && Platform.OS !== "android" && (
          <BlurView
            pointerEvents="none"
            intensity={36}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          pointerEvents="none"
          colors={
            reducedTransparency
              ? ["#244334", "#14291f"]
              : ["#a1d6b928", "#19372ddd", "#10271fe8"]
          }
          locations={reducedTransparency ? [0, 1] : [0, 0.24, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          pointerEvents="none"
          colors={["#edffcf70", "#7cd7d52b", "#f5ffc20a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[material.rim, { borderRadius: radius }]}
        />
        <View
          style={[material.inner, { borderRadius: radius - 1 }, contentStyle]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={["#b0e7bd12", "#88d8b008", "#08181235"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          {children}
        </View>
      </View>
    </View>
  );
}

type LiquidPressableProps = Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  solid?: boolean;
  selected?: boolean;
  radius?: number;
  feedback?: boolean;
};
export function PlasmaPressable({
  children,
  style,
  solid = false,
  selected = false,
  radius = 22,
  feedback = true,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}: LiquidPressableProps) {
  const { reducedMotion, reducedTransparency } = usePlasma();
  const scale = useMotionValue(1);
  const pulse = useMotionValue(1);
  const animate = (value: number) => {
    if (reducedMotion) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, {
      toValue: value,
      stiffness: 440,
      damping: 32,
      mass: 0.8,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };
  return (
    <Animated.View
      style={[
        {
          borderRadius: radius,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale }],
        },
        style,
      ]}
    >
      <Pressable
        {...props}
        aria-selected={props.accessibilityState?.selected}
        aria-expanded={props.accessibilityState?.expanded}
        aria-checked={props.accessibilityState?.checked}
        aria-disabled={disabled}
        disabled={disabled}
        onPressIn={(event) => {
          animate(0.97);
          if (!reducedMotion) {
            pulse.setValue(0);
            Animated.timing(pulse, {
              toValue: 1,
              duration: 480,
              useNativeDriver: Platform.OS !== "web",
            }).start();
          }
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animate(1);
          onPressOut?.(event);
        }}
        onPress={(event) => {
          if (feedback) selectionFeedback();
          onPress?.(event);
        }}
        style={[
          material.pressable,
          { borderRadius: radius },
          (solid || selected) && material.selected,
          reducedTransparency &&
            !solid &&
            !selected && { backgroundColor: "#244233" },
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={
            solid
              ? ["#e4ffac", "#c6ef79", "#91c754"]
              : selected
                ? ["#b5e68a38", "#81bda825"]
                : ["#d3ffe51a", "#81bda807"]
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />
        {!reducedMotion && (
          <Animated.View
            pointerEvents="none"
            style={[
              material.pulse,
              {
                opacity: pulse.interpolate({
                  inputRange: [0, 0.2, 1],
                  outputRange: [0, 0.28, 0],
                }),
                transform: [
                  {
                    scale: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 3],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
        <View
          pointerEvents="none"
          style={[material.pressRim, { borderRadius: radius }]}
        />
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function PlasmaSegments<T extends string>({
  value,
  onValueChange,
  options,
  label,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly T[];
  label: string;
}) {
  const { reducedMotion } = usePlasma();
  const [width, setWidth] = useState(0);
  const position = useMotionValue(options.indexOf(value));
  useEffect(() => {
    if (reducedMotion) {
      position.setValue(options.indexOf(value));
      return;
    }
    const animation = Animated.spring(position, {
      toValue: options.indexOf(value),
      stiffness: 360,
      damping: 31,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [value, options, position, reducedMotion]);
  const segmentWidth = Math.max(0, width - 8) / options.length;
  return (
    <View
      accessibilityLabel={label}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={material.segments}
    >
      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            material.segmentThumb,
            {
              width: segmentWidth,
              transform: [
                { translateX: Animated.multiply(position, segmentWidth) },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={["#d8f5ad38", "#5d98632b"]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      {options.map((option) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          accessibilityLabel={`${label} ${option}`}
          accessibilityState={{ selected: option === value }}
          aria-selected={option === value}
          onPress={() => {
            selectionFeedback();
            onValueChange(option);
          }}
          style={material.segment}
        >
          <Text
            style={[
              material.segmentText,
              option === value && { color: plasma.lime },
            ]}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function PlasmaSwitch({
  value,
  onValueChange,
  label,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
}) {
  const { reducedMotion } = usePlasma();
  const position = useMotionValue(value ? 1 : 0);
  useEffect(() => {
    if (reducedMotion) {
      position.setValue(value ? 1 : 0);
      return;
    }
    const animation = Animated.spring(position, {
      toValue: value ? 1 : 0,
      stiffness: 420,
      damping: 30,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [value, position, reducedMotion]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      onPress={() => {
        selectionFeedback();
        onValueChange(!value);
      }}
      hitSlop={8}
      style={[
        material.switch,
        value && { backgroundColor: "#a8d86b40", borderColor: "#c6f36a80" },
      ]}
    >
      <Animated.View
        style={[
          material.switchThumb,
          {
            transform: [
              {
                translateX: position.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 19],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={["#f1ffde", "#aacb97"]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Pressable>
  );
}

const material = StyleSheet.create({
  aurora: {
    position: "absolute",
    width: 490,
    height: 600,
    borderRadius: 250,
    top: -120,
    right: -230,
    transform: [{ rotate: "-24deg" }],
  },
  tidal: {
    position: "absolute",
    width: 420,
    height: 640,
    borderRadius: 240,
    bottom: -140,
    left: -260,
    transform: [{ rotate: "28deg" }],
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 3,
  },
  elevated: { shadowOpacity: 0.4, shadowRadius: 26, elevation: 8 },
  surface: { overflow: "hidden", backgroundColor: "#10271fbd" },
  rim: { ...StyleSheet.absoluteFill, opacity: 0.65 },
  inner: {
    margin: 1,
    backgroundColor: "#122a23ee",
    padding: 20,
    gap: 16,
    overflow: "hidden",
  },
  pressable: {
    flex: 1,
    minHeight: 44,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#c5f8db08",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  selected: { backgroundColor: "#99c87520" },
  pressRim: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderTopColor: "#edffdb40",
    borderLeftColor: "#aeecce2e",
    borderRightColor: "#c4f3b11a",
    borderBottomColor: "#d7ffca14",
  },
  pulse: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "#efffdb",
    backgroundColor: "#d6ffdb40",
    alignSelf: "center",
  },
  segments: {
    minHeight: 50,
    flexDirection: "row",
    borderRadius: 25,
    backgroundColor: "#03120e80",
    borderWidth: 1,
    borderColor: "#addbb322",
    padding: 4,
  },
  segmentThumb: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 21,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#c6f36a55",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  segmentText: { color: plasma.muted, fontSize: 14, fontWeight: "600" },
  switch: {
    height: 33,
    width: 56,
    padding: 3,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#b8ddc138",
    backgroundColor: "#03160fb3",
    justifyContent: "center",
  },
  switchThumb: {
    width: 25,
    height: 25,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
