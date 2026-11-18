import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { LogFeed, STATUS_LABEL, TownMap, UnitsBoard } from "@/components/cad";
import { Screen } from "@/components/glass";
import { Icon } from "@/components/icon";
import { SafeBody, TopBar, useScrollPadding } from "@/components/safe-area";
import { Button, Mono, Panel } from "@/components/ui";
import { stationById, UNIT_TYPE_LABEL } from "@/data/town";
import { formatClock } from "@/game/engine";
import { useGame } from "@/store/game-store";
import { colors } from "@/theme/colors";

/** In quarters, waiting for the AI dispatcher to tone out your apparatus. */
export default function StandbyScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const scrollPad = useScrollPadding();
  const seat = useGame((s) => s.seat);
  const role = useGame((s) => s.role);
  const clock = useGame((s) => s.clock);
  const units = useGame((s) => s.units);
  const incidents = useGame((s) => s.incidents);
  const log = useGame((s) => s.log);
  const playerCallAt = useGame((s) => s.playerCallAt);
  const takeConsole = useGame((s) => s.takeConsole);
  const exitToMenu = useGame((s) => s.exitToMenu);

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: 1 - pulse.value, transform: [{ scale: 1 + pulse.value * 1.4 }] }));

  const unit = units.find((u) => u.id === seat?.unitId);
  const person = unit?.crew.find((c) => c.id === seat?.crewId);
  const live = incidents.find((i) => i.scene?.status === "active");

  if (!seat || !unit || !person || role === "dispatcher" || !role) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 p-6">
          <Icon name="radio" size={32} color="muted" />
          <Text className="text-center text-ink">{"You're not in service."}</Text>
          <Button label="Main menu" icon="home" onPress={() => router.navigate("/")} />
        </View>
      </Screen>
    );
  }

  const station = stationById(unit.stationId);
  const wait = playerCallAt !== null ? Math.max(0, playerCallAt - clock) : null;

  const seatCard = (
    <Panel title="In service" icon="radio">
      <View className="items-center gap-3 p-5">
        <View className="h-24 w-24 items-center justify-center">
          <Animated.View style={[{ position: "absolute", width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: colors.radio }, pulseStyle]} />
          <View className="h-20 w-20 items-center justify-center rounded-full bg-radio/15">
            <Icon name={unit.type === "chief" ? "star" : "truck"} size={34} color="radio" />
          </View>
        </View>
        <Text className="text-xl font-bold text-ink">{person.rank} {person.name}</Text>
        <Text className="text-sm text-muted">
          {unit.name} · {UNIT_TYPE_LABEL[unit.type]} · Station {station.id} {station.name}
        </Text>
        <View className="flex-row items-center gap-2 rounded-full bg-raised px-3 py-1.5">
          <View className="h-2 w-2 rounded-full bg-radio" />
          <Mono className="text-xs text-ink">{live ? "ASSIGNED" : STATUS_LABEL[unit.status]}</Mono>
        </View>
        <Text className="text-center text-sm text-muted">
          {live
            ? "You've been toned out."
            : wait !== null
              ? `Waiting for tones… a run for ${unit.name} within ${wait}s.`
              : "Monitoring the radio. The AI dispatcher will tone you out."}
        </Text>
        {live ? (
          <Button label="Go to the call" icon="siren" tone="primary" onPress={() => router.push({ pathname: "/scene/[incidentId]", params: { incidentId: live.id } })} />
        ) : null}
      </View>
    </Panel>
  );

  return (
    <Screen>
      <TopBar>
        <Pressable accessibilityLabel="Main menu" onPress={() => router.navigate("/")} className="h-11 w-11 items-center justify-center rounded-full bg-panel">
          <Icon name="home" size={18} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-bold text-ink">Station {station.id} · {station.name}</Text>
          <Mono className="text-[10px] uppercase tracking-widest text-muted">In quarters · AI dispatcher active</Mono>
        </View>
        <Mono className="text-lg font-bold text-amber">{formatClock(clock)}</Mono>
      </TopBar>

      <SafeBody>
      <ScrollView contentContainerClassName="gap-3 p-3 w-full max-w-[1100px] self-center" contentContainerStyle={scrollPad}>
        {wide ? (
          <View className="flex-row gap-3">
            <View className="w-[380px] gap-3">
              {seatCard}
              <TownMap units={units} incidents={incidents} />
            </View>
            <View className="flex-1 gap-3">
              <LogFeed log={log} limit={60} />
              <UnitsBoard units={units} />
            </View>
          </View>
        ) : (
          <>
            {seatCard}
            <LogFeed log={log} limit={30} />
            <TownMap units={units} incidents={incidents} />
          </>
        )}
        <View className="flex-row flex-wrap gap-2">
          <Button
            className="flex-1"
            label="Take the console"
            icon="headset"
            tone="radio"
            onPress={() => {
              takeConsole();
              router.replace("/dispatch");
            }}
          />
          <Button
            className="flex-1"
            label="Go out of service"
            icon="home"
            onPress={() => {
              exitToMenu();
              router.navigate("/");
            }}
          />
        </View>
      </ScrollView>
      </SafeBody>
    </Screen>
  );
}
