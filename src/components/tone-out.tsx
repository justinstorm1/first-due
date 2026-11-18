import { router } from "expo-router";
import { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { incidentTypeById } from "@/data/incident-types";
import { useGame } from "@/store/game-store";
import { colors } from "@/theme/colors";
import { Icon } from "./icon";
import { Button, Mono } from "./ui";

const AUTO_RESPOND_MS = 3500;

/** Full-screen "tones dropped" alert when the AI dispatcher assigns the player's unit. */
export function ToneOut() {
  const id = useGame((s) => s.pendingSceneId);
  const incident = useGame((s) => s.incidents.find((i) => i.id === s.pendingSceneId));
  const unit = useGame((s) => s.units.find((u) => u.id === s.seat?.unitId));
  const consume = useGame((s) => s.consumePendingScene);
  const flash = useSharedValue(0);

  const respond = (incidentId: string) => {
    consume();
    router.push({ pathname: "/scene/[incidentId]", params: { incidentId } });
  };
  useEffect(() => {
    if (!id) return;
    flash.value = withRepeat(withTiming(1, { duration: 380 }), -1, true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    const t = setTimeout(() => respond(id), AUTO_RESPOND_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: 0.25 + flash.value * 0.45 }));
  if (!id || !incident) return null;
  const type = incidentTypeById(incident.typeId);

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
      <View className="flex-1 items-center justify-center bg-black/80 p-6">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.alert }, flashStyle]} pointerEvents="none" />
      <View className="w-full max-w-[460px] items-center gap-3 rounded-[28px] border border-alert bg-surface p-6">
        <Icon name="siren" size={44} color="alert" />
        <Mono className="text-xs uppercase tracking-[4px] text-alert">Tones dropped</Mono>
        <Text className="text-center text-2xl font-black text-ink">{unit?.name ?? "Your unit"}</Text>
        <Text className="text-center text-lg font-semibold text-amber">{type.label}</Text>
        <Text className="text-center text-sm text-muted">{incident.address} · {incident.note}</Text>
        <Text className="text-center text-xs text-dim">{incident.conditions}</Text>
        <Button testID="tone-respond" className="mt-2 w-full" label="Respond" icon="siren" tone="primary" onPress={() => respond(id)} />
      </View>
      </View>
    </Animated.View>
  );
}
