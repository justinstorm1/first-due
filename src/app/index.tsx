import { router } from "expo-router";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { TopBar, useScrollPadding } from "@/components/safe-area";
import { Button, haptic, Mono, Panel } from "@/components/ui";
import { CERTS, errorRate, hasCert, rankFor } from "@/game/engine";
import type { IconName, Role } from "@/game/types";
import { useGame } from "@/store/game-store";

const MODES: { role: Role; title: string; sub: string; icon: IconName; standard: string }[] = [
  { role: "dispatcher", title: "Dispatcher", sub: "Take 911 calls, classify incidents, and send the right Middletown apparatus.", icon: "headset", standard: "Telecommunicator · SOG run cards" },
  { role: "ff", title: "Fire Fighter I & II", sub: "Ride the back step. Make nozzle, search, vent, and SCBA decisions under pressure.", icon: "flame", standard: "NFPA 1001 · IFSTA Essentials" },
  { role: "officer", title: "Fire Officer", sub: "Run a company: size-up, RIC, flow path, transitional attack, and crew integrity.", icon: "shield", standard: "NFPA 1021 · NJ Fire Officer" },
  { role: "chief", title: "Adv. Tactics & Chief", sub: "Command multi-alarm incidents: staging, Maydays, divisions, and risk management.", icon: "star", standard: "NIMS · NFPA 1561 · N.J.A.C. 5:75" },
];

export default function MainMenu() {
  const { width } = useWindowDimensions();
  const twoUp = width >= 720;
  const scrollPad = useScrollPadding();
  const profile = useGame((s) => s.profile);
  const role = useGame((s) => s.role);
  const startSession = useGame((s) => s.startSession);
  const earned = CERTS.filter((c) => hasCert(profile, c.id)).length;

  const start = (r: Role) => {
    haptic("tap");
    const id = startSession(r);
    if (r === "dispatcher") router.push("/dispatch");
    else if (id) router.push({ pathname: "/scene/[incidentId]", params: { incidentId: id } });
  };

  return (
    <View className="flex-1 bg-bg">
      <TopBar>
          <View className="h-12 w-12 items-center justify-center rounded-xl border border-alert/60 bg-alert/15">
            <Icon name="siren" size={26} color="alert" />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-black tracking-tight text-ink">FIRST DUE</Text>
            <Mono className="text-[11px] uppercase tracking-widest text-muted">Middletown Twp · Fire Training Sim</Mono>
          </View>
          <Pressable
            accessibilityLabel="Open profile"
            onPress={() => router.push("/profile")}
            className="h-11 w-11 items-center justify-center rounded-full border border-line bg-panel"
          >
            <Icon name="user" size={20} color="ink" />
          </Pressable>
      </TopBar>
      <ScrollView contentContainerClassName="gap-4 p-4 w-full max-w-[880px] self-center" contentContainerStyle={scrollPad}>

        <Panel title="Career Record" icon="award">
          <View className="flex-row flex-wrap gap-y-3 p-3">
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
            label="Resume current tour"
            icon="play"
            tone="radio"
            onPress={() => {
              const s = useGame.getState();
              const live = s.incidents.find((i) => i.scene?.status === "active");
              const done = s.incidents.find((i) => i.scene?.status === "complete");
              if (role !== "dispatcher" && live) router.push({ pathname: "/scene/[incidentId]", params: { incidentId: live.id } });
              else if (role !== "dispatcher" && done) router.push({ pathname: "/debrief/[incidentId]", params: { incidentId: done.id } });
              else router.push("/dispatch");
            }}
          />
        ) : null}

        <Mono className="px-1 text-[11px] uppercase tracking-widest text-dim">Select a mode</Mono>
        <View className="flex-row flex-wrap gap-3">
          {MODES.map((m, i) => (
            <Animated.View key={m.role} entering={FadeInDown.delay(i * 70)} style={{ width: twoUp ? "48.9%" : "100%" }}>
              <Pressable
                testID={`mode-${m.role}`}
                onPress={() => start(m.role)}
                className="h-full gap-2 rounded-xl border border-line bg-panel p-4 active:border-amber active:bg-raised"
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-lg bg-raised">
                    <Icon name={m.icon} size={20} color="amber" />
                  </View>
                  <Text className="flex-1 text-lg font-bold text-ink">{m.title}</Text>
                  <Icon name="play" size={16} color="muted" />
                </View>
                <Text className="text-sm leading-5 text-muted">{m.sub}</Text>
                <Mono className="text-[10px] uppercase tracking-wider text-dim">{m.standard}</Mono>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        <Text className="px-1 text-xs leading-5 text-dim">
          {"This is a training aid, not official NJDFS exam material. Stations, run cards, and addresses are fictionalized. " +
            "Always follow your department's SOGs and the current IFSTA/NFPA editions."}
        </Text>
      </ScrollView>
    </View>
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
