import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import type { Building, Metrics } from "@/game/types";
import { colors } from "@/theme/colors";
import { Icon } from "./icon";

/** Pulsing flame that scales with hazard intensity. */
function Flicker({ size, delay, x, y }: { size: number; delay: number; x: string; y: string }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 380 + delay, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.9, { duration: 320 + delay, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [s, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: x as `${number}%`, top: y as `${number}%` }, style]}>
      <Icon name="flame" size={size} color="fire" strokeWidth={2.4} />
    </Animated.View>
  );
}

function Smoke({ opacity }: { opacity: number }) {
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.linear }), -1, false);
  }, [drift]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity * (1 - drift.value * 0.6),
    transform: [{ translateY: -drift.value * 30 }, { scale: 1 + drift.value * 0.4 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", top: 0, left: "15%", right: "15%", height: "55%", borderRadius: 999, backgroundColor: colors.smoke }, style]}
    />
  );
}

const BOX = { backgroundColor: colors.raised, borderColor: colors.line, borderWidth: 1 } as const;

function Structure({ building }: { building: Building }) {
  switch (building) {
    case "house":
      return (
        <View className="items-center">
          <View style={{ width: 0, height: 0, borderLeftWidth: 80, borderRightWidth: 80, borderBottomWidth: 50, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: colors.line }} />
          <View style={[BOX, { width: 150, height: 80, flexDirection: "row", justifyContent: "space-around", alignItems: "center" }]}>
            <Window /><View style={{ width: 22, height: 44, marginTop: 34, backgroundColor: colors.panel }} /><Window />
          </View>
        </View>
      );
    case "apartment":
      return (
        <View style={[BOX, { width: 220, height: 130, padding: 8, gap: 8 }]}>
          {[0, 1, 2].map((r) => (
            <View key={r} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {[0, 1, 2, 3, 4].map((c) => <Window key={c} />)}
            </View>
          ))}
        </View>
      );
    case "stripmall":
    case "commercial":
      return (
        <View>
          <View style={{ height: 8, width: 260, backgroundColor: colors.line }} />
          <View style={[BOX, { width: 260, height: 70, flexDirection: "row" }]}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ flex: 1, borderRightWidth: i < 3 ? 1 : 0, borderColor: colors.line, justifyContent: "flex-end", padding: 6 }}>
                <View style={{ height: 34, backgroundColor: colors.panel, borderRadius: 2 }} />
              </View>
            ))}
          </View>
        </View>
      );
    case "vehicle":
      return (
        <View className="flex-row items-end gap-6">
          <Icon name="car" size={78} color="muted" strokeWidth={1.4} />
          <View style={{ transform: [{ rotate: "-12deg" }] }}><Icon name="car" size={64} color="dim" strokeWidth={1.4} /></View>
        </View>
      );
    case "woods":
      return (
        <View className="flex-row items-end">
          {[60, 84, 70, 92, 66].map((s, i) => <Icon key={i} name="trees" size={s} color="radio" strokeWidth={1.3} />)}
        </View>
      );
    case "boat":
      return (
        <View className="items-center">
          <Icon name="anchor" size={70} color="info" strokeWidth={1.3} />
          <View style={{ width: 260, height: 10, marginTop: 6, backgroundColor: colors.info, opacity: 0.35, borderRadius: 4 }} />
        </View>
      );
  }
}

function Window() {
  return <View style={{ width: 22, height: 22, backgroundColor: colors.panel, borderColor: colors.line, borderWidth: 1 }} />;
}

export function SceneVisual({ building, metrics, mayday, burning }: { building: Building; metrics: Metrics; mayday: boolean; burning: boolean }) {
  const intensity = burning ? metrics.fire / 100 : 0;
  const flames = Math.round(intensity * 6);
  const spots = [
    { x: "30%", y: "38%" }, { x: "58%", y: "30%" }, { x: "44%", y: "50%" },
    { x: "20%", y: "55%" }, { x: "68%", y: "52%" }, { x: "50%", y: "22%" },
  ];
  const strobe = useSharedValue(0);
  useEffect(() => {
    strobe.value = withRepeat(withTiming(1, { duration: 600 }), -1, true);
  }, [strobe]);
  const strobeStyle = useAnimatedStyle(() => ({ opacity: mayday ? 0.15 + strobe.value * 0.25 : 0.05 + strobe.value * 0.08 }));

  return (
    <View className="h-56 overflow-hidden rounded-xl border border-line bg-bg">
      <Animated.View pointerEvents="none" style={[{ position: "absolute", inset: 0, backgroundColor: mayday ? colors.alert : colors.info }, strobeStyle]} />
      <Smoke opacity={Math.min(0.85, 0.15 + intensity * 0.8)} />
      <View className="flex-1 items-center justify-end pb-6">
        <Structure building={building} />
      </View>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 22, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.line }} />
      {spots.slice(0, flames).map((p, i) => (
        <Flicker key={i} size={22 + intensity * 26} delay={i * 40} x={p.x} y={p.y} />
      ))}
    </View>
  );
}
