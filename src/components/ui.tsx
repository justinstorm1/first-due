import * as Haptics from "expo-haptics";
import { useEffect, type ReactNode } from "react";
import { Platform, Pressable, Text, View, type TextProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import type { IconName } from "@/game/types";
import { colors } from "@/theme/colors";
import { LIQUID_GLASS, RADIUS, Surface } from "./glass";
import { Icon, type ColorToken } from "./icon";

export const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "ui-monospace, Menlo, monospace" });

export function haptic(kind: "tap" | "success" | "error" | "warning") {
  if (Platform.OS === "web") return;
  if (kind === "tap") Haptics.selectionAsync();
  else
    Haptics.notificationAsync(
      kind === "success"
        ? Haptics.NotificationFeedbackType.Success
        : kind === "error"
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Warning,
    );
}

export function Mono({ style, ...props }: TextProps) {
  return <Text {...props} style={[{ fontFamily: MONO }, style]} />;
}

export function Panel({ children, className = "", title, icon, right }: {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: IconName;
  right?: ReactNode;
}) {
  return (
    <Surface
      radius={RADIUS.card}
      className={`android:bg-panel web:border web:border-line web:bg-panel/90 web:shadow-sm ${LIQUID_GLASS ? "" : "ios:border ios:border-white/5 ios:bg-panel/90"} ${className}`}
    >
      {title ? (
        <View className="flex-row items-center gap-2 border-b border-white/5 px-4 py-2.5 web:border-line">
          {icon ? <Icon name={icon} size={14} color="muted" /> : null}
          <Text className="flex-1 text-[12px] font-semibold tracking-tight text-muted ios:text-[13px] web:text-sm web:text-ink">{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </Surface>
  );
}

const BUTTON_TONE = {
  primary: { box: "bg-alert border-alert", text: "text-white", icon: "ink" },
  amber: { box: "bg-amber border-amber", text: "text-bg", icon: "bg" },
  ghost: { box: "bg-raised border-line web:bg-transparent web:hover:bg-raised", text: "text-ink", icon: "ink" },
  radio: { box: "bg-radio border-radio", text: "text-bg", icon: "bg" },
} as const satisfies Record<string, { box: string; text: string; icon: ColorToken }>;

export function Button({ label, onPress, icon, tone = "ghost", disabled, className = "", small, testID }: {
  testID?: string;
  label: string;
  onPress: () => void;
  icon?: IconName;
  tone?: keyof typeof BUTTON_TONE;
  disabled?: boolean;
  className?: string;
  small?: boolean;
}) {
  const t = BUTTON_TONE[tone];
  // Shape language: iOS capsule, Android M3 pill, web shadcn rounded-md.
  const shape = "ios:rounded-full android:rounded-full web:rounded-md";
  const size = small ? "min-h-[36px] px-3.5" : "min-h-[48px] px-5";
  const content = (
    <>
      {icon ? <Icon name={icon} size={small ? 14 : 16} color={t.icon} /> : null}
      <Text className={`font-semibold ${small ? "text-xs" : "text-[15px] web:text-sm"} ${t.text}`}>{label}</Text>
    </>
  );
  const press = () => {
    haptic("tap");
    onPress();
  };
  // iOS 26: secondary buttons are interactive Liquid Glass capsules.
  if (LIQUID_GLASS && tone === "ghost") {
    return (
      <Surface interactive radius={RADIUS.pill} className={`${disabled ? "opacity-40" : ""} ${className}`}>
        <Pressable
          accessibilityRole="button"
          testID={testID}
          disabled={disabled}
          onPress={press}
          className={`flex-row items-center justify-center gap-2 ${size}`}
        >
          {content}
        </Pressable>
      </Surface>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      disabled={disabled}
      onPress={press}
      android_ripple={{ color: "rgba(255,255,255,0.18)", borderless: false, foreground: true }}
      className={`flex-row items-center justify-center gap-2 overflow-hidden border ${shape} ${size} ${t.box} ${disabled ? "opacity-40" : "active:opacity-80 web:hover:opacity-90"} web:transition-opacity web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-amber web:focus-visible:ring-offset-2 web:ring-offset-bg ${className}`}
    >
      {content}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, tone = "info" }: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: "info" | "alert" | "amber" | "radio";
}) {
  const sel = { info: "border-info bg-info/20", alert: "border-alert bg-alert/20", amber: "border-amber bg-amber/20", radio: "border-radio bg-radio/20" }[tone];
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.15)" }}
      className={`min-h-[36px] justify-center overflow-hidden border px-3.5 ios:rounded-full android:rounded-lg web:rounded-full web:transition-colors ${selected ? sel : "border-line bg-raised web:hover:bg-panel"}`}
    >
      <Text className={`text-xs ${selected ? "font-semibold text-ink" : "text-muted"}`}>{label}</Text>
    </Pressable>
  );
}

export function Meter({ label, value, icon, invert }: {
  label: string;
  value: number;
  icon: IconName;
  /** When true, high values are bad (e.g. thermal stress). */
  invert?: boolean;
}) {
  const width = useSharedValue(value);
  useEffect(() => {
    width.value = withTiming(value, { duration: 450 });
  }, [value, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  const goodness = invert ? 100 - value : value;
  const iconTone: ColorToken = goodness > 60 ? "radio" : goodness > 30 ? "amber" : "alert";
  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-1.5">
        <Icon name={icon} size={12} color={iconTone} />
        <Text className="flex-1 text-[11px] text-muted">{label}</Text>
        <Mono className="text-[11px] text-ink">{Math.round(value)}</Mono>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-raised">
        <Animated.View style={[{ height: "100%", borderRadius: 999, backgroundColor: colors[iconTone] }, style]} />
      </View>
    </View>
  );
}

export function StatusDot({ tone }: { tone: "radio" | "amber" | "alert" | "info" | "dim" }) {
  const cls = { radio: "bg-radio", amber: "bg-amber", alert: "bg-alert", info: "bg-info", dim: "bg-dim" }[tone];
  return <View className={`h-2 w-2 rounded-full ${cls}`} />;
}
