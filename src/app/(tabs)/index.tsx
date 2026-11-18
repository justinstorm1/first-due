import { router } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { glassSafe, RADIUS, Screen, Surface } from "@/components/glass";
import { Icon } from "@/components/icon";
import { SafeBody, TAB_SCROLL_PADDING, TopBar } from "@/components/safe-area";
import { SeatPicker } from "@/components/seat-picker";
import { Button, haptic, Mono, Panel } from "@/components/ui";
import { QUESTIONS } from "@/data/questions";
import { SCENARIO_COUNT } from "@/data/incident-types";
import { CERTS, errorRate, hasCert, rankFor } from "@/game/engine";
import type { FieldRole, IconName } from "@/game/types";
import { useGame } from "@/store/game-store";

type Mode = { key: "dispatcher" | FieldRole | "drill"; title: string; sub: string; icon: IconName; standard: string };

const MODES: Mode[] = [
  { key: "dispatcher", title: "Dispatcher", sub: "Take 911 calls, classify incidents, and send the right Middletown apparatus.", icon: "headset", standard: "Telecommunicator · SOG run cards" },
  { key: "ff", title: "Stand by · Firefighter", sub: "Pick your station and seat. The AI dispatcher tones you out when your rig is due.", icon: "flame", standard: "NFPA 1001 · IFSTA Essentials" },
  { key: "officer", title: "Stand by · Company Officer", sub: "Ride the officer's seat: size-up, RIC, flow path, crew integrity.", icon: "shield", standard: "NFPA 1021 · NJ Fire Officer" },
  { key: "chief", title: "Stand by · Chief Officer", sub: "Respond in a car: command, staging, Maydays, and risk management.", icon: "star", standard: "NIMS · NFPA 1561 · N.J.A.C. 5:75" },
  { key: "drill", title: "Practice Exam", sub: "Untimed drills from the full 2,000+ question bank, by certification track.", icon: "clipboard", standard: "All tracks" },
];

export default function MainMenu() {
  const { width } = useWindowDimensions();
  const twoUp = width >= 720;
  const scrollPad = TAB_SCROLL_PADDING;
  const profile = useGame((s) => s.profile);
  const role = useGame((s) => s.role);
  const seat = useGame((s) => s.seat);
  const startDispatcher = useGame((s) => s.startDispatcher);
  const startStandby = useGame((s) => s.startStandby);
  const [picking, setPicking] = useState<FieldRole | null>(null);
  const earned = CERTS.filter((c) => hasCert(profile, c.id)).length;

  const open = (m: Mode) => {
    haptic("tap");
    if (m.key === "dispatcher") {
      startDispatcher();
      router.push("/dispatch");
    } else if (m.key === "drill") {
      router.push("/drill");
    } else {
      setPicking(m.key);
    }
  };

  const resume = () => {
    const s = useGame.getState();
    const live = s.incidents.find((i) => i.scene?.status === "active");
    if (s.role !== "dispatcher" && live) router.push({ pathname: "/scene/[incidentId]", params: { incidentId: live.id } });
    else if (s.role !== "dispatcher") router.push("/standby");
    else router.push("/dispatch");
  };

  return (
    <Screen>
      {/* Desktop web shows the brand in its navbar; phones (native or web) get this top bar. */}
      {Platform.OS !== "web" || !twoUp ? (
      <TopBar>
        <View className="h-11 w-11 items-center justify-center rounded-2xl border border-alert/60 bg-alert/15">
          <Icon name="siren" size={22} color="alert" />
        </View>
        <View className="flex-1">
          <Text className="text-xl font-black tracking-tight text-ink">FIRST DUE</Text>
          <Mono className="text-[10px] uppercase tracking-widest text-muted">Middletown Twp · Fire Training Sim</Mono>
        </View>
        <Pressable
          accessibilityLabel="Open profile"
          onPress={() => router.push("/profile")}
          className="h-11 w-11 items-center justify-center rounded-full border border-line bg-panel web:hover:bg-raised"
        >
          <Icon name="user" size={20} color="ink" />
        </Pressable>
      </TopBar>
      ) : null}
      <SafeBody>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-4 p-4 w-full max-w-[880px] self-center" contentContainerStyle={scrollPad}>
        <Panel title="Career record" icon="award">
          <View className="flex-row flex-wrap gap-y-3 p-4">
            <Stat label="Member" value={profile.name} />
            <Stat label="Rank" value={rankFor(profile)} />
            <Stat label="Standing" value={`${Math.round(profile.standing)}/100`} tone={profile.standing < 50 ? "text-alert" : "text-radio"} />
            <Stat label="Error rate" value={`${Math.round(errorRate(profile) * 100)}%`} tone={errorRate(profile) > 0.35 ? "text-alert" : "text-ink"} />
            <Stat label="Certificates" value={`${earned}/${CERTS.length}`} />
            <Stat label="Write-ups" value={String(profile.writeUps.length)} tone={profile.writeUps.length ? "text-amber" : "text-ink"} />
          </View>
        </Panel>

        {role ? (
          <Button
            label={role === "dispatcher" ? "Resume CAD console" : seat ? "Resume: in service" : "Resume tour"}
            icon="play"
            tone="radio"
            onPress={resume}
          />
        ) : null}

        <Mono className="px-1 text-[11px] uppercase tracking-widest text-dim">Select a mode</Mono>
        <View className="flex-row flex-wrap gap-3">
          {MODES.map((m, i) => (
            <Animated.View key={m.key} entering={glassSafe(FadeInDown.delay(i * 60))} style={{ width: twoUp ? "48.9%" : "100%" }}>
              <Surface interactive radius={RADIUS.card} className="h-full android:bg-panel web:border web:border-line web:bg-panel/90">
                <Pressable
                  testID={`mode-${m.key}`}
                  onPress={() => open(m)}
                  android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                  className="h-full gap-2 p-4 web:transition-colors web:hover:bg-raised"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-raised">
                      <Icon name={m.icon} size={20} color="amber" />
                    </View>
                    <Text className="flex-1 text-[17px] font-bold text-ink">{m.title}</Text>
                    <Icon name="play" size={16} color="muted" />
                  </View>
                  <Text className="text-sm leading-5 text-muted">{m.sub}</Text>
                  <Mono className="text-[10px] uppercase tracking-wider text-dim">{m.standard}</Mono>
                </Pressable>
              </Surface>
            </Animated.View>
          ))}
        </View>

        <Text className="px-1 text-xs leading-5 text-dim">
          {`${QUESTIONS.length.toLocaleString("en-US")} exam questions · ${SCENARIO_COUNT.toLocaleString("en-US")} scenario combinations. ` +
            "This is a training aid, not official NJDFS exam material. Stations, run cards, and addresses are fictionalized. " +
            "Always follow your department's SOGs and the current IFSTA/NFPA editions."}
        </Text>
      </ScrollView>
      </SafeBody>

      {picking ? (
        <SeatPicker
          role={picking}
          visible
          onClose={() => setPicking(null)}
          onConfirm={(s) => {
            setPicking(null);
            startStandby(s);
            router.push("/standby");
          }}
        />
      ) : null}
    </Screen>
  );
}

function Stat({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <View className="w-1/2 gap-0.5 sm:w-1/3">
      <Mono className="text-[10px] uppercase tracking-widest text-dim">{label}</Mono>
      <Text className={`text-sm font-semibold ${tone}`} numberOfLines={1}>{value}</Text>
    </View>
  );
}
