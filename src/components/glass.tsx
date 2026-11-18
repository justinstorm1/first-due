import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { cssInterop } from "nativewind";

import { colors } from "@/theme/colors";

cssInterop(GlassView, { className: "style" });

/** iOS 26+ Liquid Glass is available (false on Android, web and older iOS). */
export const LIQUID_GLASS = Platform.OS === "ios" && isLiquidGlassAvailable();

/** Corner radii per platform design language (iOS continuous cards, M3 large shape, shadcn radius). */
export const RADIUS = {
  card: Platform.select({ ios: 26, android: 24, default: 12 }) as number,
  sheet: Platform.select({ ios: 34, android: 28, default: 16 }) as number,
  pill: 999,
  none: 0,
};

/**
 * Platform surface:
 *  - iOS 26+: Liquid Glass (GlassView), tinted toward the app's dark palette.
 *  - Android: Material 3 tonal surface with elevation.
 *  - Web / older iOS: shadcn-style card surface (colors/border from the caller's className).
 *
 * `radius` is applied to BOTH the glass container and an inner content wrapper that clips its
 * children, so the glass shape and everything inside it always share the same corner radius.
 */
export function Surface({
  children,
  className = "",
  style,
  interactive,
  glass = "regular",
  radius = 0,
  topOnly = false,
}: {
  children?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  glass?: "regular" | "clear";
  radius?: number;
  /** Round only the top corners (bottom sheets). */
  topOnly?: boolean;
}) {
  const shape: ViewStyle = topOnly
    ? { borderTopLeftRadius: radius, borderTopRightRadius: radius }
    : { borderRadius: radius };
  const content = <View style={[shape, styles.clip]}>{children}</View>;

  if (LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle={glass}
        tintColor="rgba(19,26,35,0.55)"
        colorScheme="dark"
        isInteractive={interactive}
        className={className}
        style={[shape, style]}
      >
        {content}
      </GlassView>
    );
  }
  return (
    <View className={className} style={[shape, Platform.OS === "android" ? styles.elevated : null, style]}>
      {content}
    </View>
  );
}

/** Soft ambient glows behind content, so glass surfaces have light to refract. */
export function Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {[
        { color: colors.fire, top: -160, right: -140, size: 420 },
        { color: colors.info, bottom: -180, left: -160, size: 460 },
      ].map((g, i) => (
        <View key={i} style={{ position: "absolute", top: g.top, right: g.right, bottom: g.bottom, left: g.left }}>
          {[1, 0.8, 0.6, 0.42].map((k) => (
            <View
              key={k}
              style={{
                position: "absolute",
                width: g.size * k,
                height: g.size * k,
                borderRadius: g.size,
                top: (g.size * (1 - k)) / 2,
                left: (g.size * (1 - k)) / 2,
                backgroundColor: g.color,
                opacity: 0.045,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Screen root: app background + ambient backdrop. `collapsable={false}` keeps native-tab scroll-to-top working. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 overflow-hidden bg-bg" collapsable={false}>
      <Backdrop />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden", flexGrow: 1, flexShrink: 1 },
  elevated: { elevation: 2 },
});
