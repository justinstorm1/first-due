import * as Haptics from "expo-haptics";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { colors } from "@/theme/colors";
import { Flame, FlameCore, TileBackground, TILE_RADIUS_RATIO } from "./flame-mark";
import { MONO } from "./ui";

/** Must match `imageWidth` of the expo-splash-screen plugin in app.json for a seamless handoff. */
export const SPLASH_TILE = 120;

const EXIT_AT = 1900;

// Stacked faint discs approximate a smooth radial falloff without a blur/gradient library.
const GLOW_STEPS = [3.0, 2.65, 2.3, 2.0, 1.75, 1.5, 1.3, 1.15];

// Generated once per launch, outside render.
const EMBERS = Array.from({ length: 26 }, (_, i) => ({
  x: (Math.random() - 0.5) * SPLASH_TILE * 0.7,
  drift: (Math.random() - 0.5) * 120,
  rise: 140 + Math.random() * 180,
  size: 4 + Math.random() * 5,
  delay: 180 + Math.random() * 1100,
  duration: 900 + Math.random() * 700,
  hot: i % 3 === 0,
}));

/**
 * Animated launch screen. Starts pixel-matched to the native splash (same tile, same size,
 * same background), hides the native splash on first layout, then plays:
 * pop → heat glow + shockwave rings → rising embers & flickering flame → title → zoom-through reveal.
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const started = useRef(false);

  const tileScale = useSharedValue(1);
  const glow = useSharedValue(0);
  const ringA = useSharedValue(0);
  const ringB = useSharedValue(0);
  const flicker = useSharedValue(0);
  const title = useSharedValue(0);
  const exit = useSharedValue(0);
  const fade = useSharedValue(1);

  const start = () => {
    if (started.current) return;
    started.current = true;
    SplashScreen.hide();

    if (reduced) {
      title.value = withTiming(1, { duration: 250 });
      fade.value = withDelay(700, withTiming(0, { duration: 300 }));
      setTimeout(onDone, 1050);
      return;
    }

    // Pop: a quick compress, then spring past full size like ignition.
    tileScale.value = withSequence(
      withTiming(0.9, { duration: 140, easing: Easing.out(Easing.quad) }),
      withSpring(1.12, { damping: 7, stiffness: 180 }),
    );
    setTimeout(() => {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 160);

    glow.value = withDelay(140, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    ringA.value = withDelay(160, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    ringB.value = withDelay(420, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }));
    flicker.value = withDelay(
      200,
      withRepeat(withTiming(1, { duration: 170, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    title.value = withDelay(520, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));

    // Zoom through the flame into the app.
    exit.value = withDelay(EXIT_AT, withTiming(1, { duration: 620, easing: Easing.in(Easing.cubic) }));
    fade.value = withDelay(EXIT_AT + 260, withTiming(0, { duration: 380 }));
    setTimeout(onDone, EXIT_AT + 680);
  };

  useEffect(() => {
    // Safety net: never leave the native splash up if layout is delayed.
    const t = setTimeout(start, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const tileStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tileScale.value * (1 + exit.value * 13) }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: title.value * (1 - exit.value * 2.5),
    transform: [{ translateY: (1 - title.value) * 18 + exit.value * 30 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * (1 - exit.value),
    transform: [{ scale: 0.6 + glow.value * 0.9 + flicker.value * 0.05 }],
  }));
  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(flicker.value - 0.5) * 3}deg` }, { scaleY: 1 + flicker.value * 0.035 }],
  }));
  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + flicker.value * 0.09 }, { scaleX: 1 - flicker.value * 0.03 }],
  }));


  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]} onLayout={start} pointerEvents="none">
      <View style={styles.center}>
        <Animated.View style={[styles.glowWrap, glowStyle]}>
          {GLOW_STEPS.map((k) => (
            <View
              key={k}
              style={{
                position: "absolute",
                width: SPLASH_TILE * k,
                height: SPLASH_TILE * k,
                borderRadius: SPLASH_TILE * k,
                backgroundColor: colors.fire,
                opacity: 0.07,
              }}
            />
          ))}
        </Animated.View>
        <Ring progress={ringA} />
        <Ring progress={ringB} />
        {!reduced ? EMBERS.map((e, i) => <Ember key={i} {...e} />) : null}

        <Animated.View style={[styles.tile, tileStyle]}>
          <TileBackground size={SPLASH_TILE} />
          <Animated.View style={[StyleSheet.absoluteFill, styles.flameOrigin, flameStyle]}>
            <Flame size={SPLASH_TILE} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.coreOrigin, coreStyle]}>
            <FlameCore size={SPLASH_TILE} />
          </Animated.View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.titleWrap, titleStyle]}>
        <Text style={styles.title}>FIRST DUE</Text>
        <Text style={styles.subtitle}>FIRE TRAINING SIM</Text>
      </Animated.View>
    </Animated.View>
  );
}

function Ring({ progress }: { progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : (1 - progress.value) * 0.7,
    transform: [{ scale: 0.9 + progress.value * 2.6 }],
  }));
  return <Animated.View style={[styles.ring, style]} />;
}

function Ember({ x, drift, rise, size, delay, duration, hot }: {
  x: number;
  drift: number;
  rise: number;
  size: number;
  delay: number;
  duration: number;
  hot: boolean;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) }));
  }, [t, delay, duration]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : Math.sin(t.value * Math.PI) * 0.95,
    transform: [
      { translateX: x + drift * t.value + Math.sin(t.value * 9) * 6 },
      { translateY: SPLASH_TILE * 0.2 - rise * t.value },
      { scale: 1 - t.value * 0.6 },
    ],
  }));
  return (
    <Animated.View
      style={[
        { position: "absolute", width: size, height: size, borderRadius: size, backgroundColor: hot ? colors.amber : colors.fire },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: colors.bg, zIndex: 100 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tile: {
    width: SPLASH_TILE,
    height: SPLASH_TILE,
    borderRadius: SPLASH_TILE * TILE_RADIUS_RATIO,
    overflow: "hidden",
  },
  flameOrigin: { transformOrigin: "50% 85%" },
  coreOrigin: { transformOrigin: "50% 84%" },
  // Concentric low-opacity discs fake a soft radial heat glow on every platform.
  glowWrap: { position: "absolute", alignItems: "center", justifyContent: "center", opacity: 0 },
  ring: {
    position: "absolute",
    width: SPLASH_TILE,
    height: SPLASH_TILE,
    borderRadius: SPLASH_TILE * TILE_RADIUS_RATIO,
    borderWidth: 2,
    borderColor: colors.amber,
    opacity: 0,
  },
  titleWrap: { position: "absolute", left: 0, right: 0, top: "50%", marginTop: SPLASH_TILE * 0.5 + 44, alignItems: "center", gap: 6 },
  title: { color: colors.ink, fontSize: 30, fontWeight: "900", letterSpacing: 6 },
  subtitle: { color: colors.muted, fontSize: 11, letterSpacing: 4, fontFamily: MONO },
});
