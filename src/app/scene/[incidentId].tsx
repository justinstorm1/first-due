import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeInRight, SlideInRight } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { glassSafe, Screen } from "@/components/glass";
import { Icon } from "@/components/icon";
import { SafeBody, TopBar, useScrollPadding } from "@/components/safe-area";
import { QuestionSheet } from "@/components/question-sheet";
import { SceneVisual } from "@/components/scene-visual";
import { Button, haptic, Meter, Mono, Panel } from "@/components/ui";
import { incidentTypeById } from "@/data/incident-types";
import { questionById } from "@/data/questions";
import { formatClock } from "@/game/engine";
import { ACTIONS_PER_PHASE, useGame } from "@/store/game-store";

const ROLE_LABEL = { ff: "Fire Fighter", officer: "Company Officer", chief: "Incident Commander" } as const;

export default function SceneScreen() {
  const { incidentId } = useLocalSearchParams<{ incidentId: string }>();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const incident = useGame((s) => s.incidents.find((i) => i.id === incidentId));
  const unit = useGame((s) => s.units.find((u) => u.id === incident?.scene?.unitId));
  const clock = useGame((s) => s.clock);
  const radio = useGame((s) => s.log.find((e) => e.kind === "ai" || e.kind === "radio" || e.kind === "call"));
  const chooseAction = useGame((s) => s.chooseAction);
  const answerScene = useGame((s) => s.answerScene);
  const continueScene = useGame((s) => s.continueScene);
  const leaveScene = useGame((s) => s.leaveScene);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const scrollPad = useScrollPadding();

  const scene = incident?.scene;
  const complete = scene?.status === "complete";
  const mayday = !!scene && scene.phases[scene.phaseIndex]?.key === "mayday";

  useEffect(() => {
    if (complete) router.replace({ pathname: "/debrief/[incidentId]", params: { incidentId } });
  }, [complete, incidentId]);

  useEffect(() => {
    if (mayday) haptic("error");
  }, [mayday]);

  if (!incident || !scene || scene.status === "abandoned") {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <View className="flex-1 items-center justify-center gap-4 p-6">
        <Icon name="alert" size={32} color="amber" />
        <Text className="text-center text-ink">This incident is no longer active.</Text>
        <Button label="Main menu" icon="home" onPress={() => router.navigate("/")} />
        </View>
      </SafeAreaView>
    );
  }

  const type = incidentTypeById(incident.typeId);
  const phase = scene.phases[Math.min(scene.phaseIndex, scene.phases.length - 1)];
  const m = scene.metrics;
  const pendingQ = scene.pending ? questionById(scene.pending.questionId) : undefined;
  const pendingAction = scene.pending ? phase.actions[scene.pending.actionIndex] : undefined;
  const needed = Math.min(ACTIONS_PER_PHASE, phase.actions.length);

  const meters = (
    <Panel title="Status" icon="activity">
      <View className="gap-3 p-3">
        <Meter label="Air Supply" value={m.air} icon="gauge" />
        <Meter label="Thermal Stress" value={m.thermal} icon="thermometer" invert />
        <Meter label="Scene Safety" value={m.safety} icon="shield" />
        <Meter label="Victim Status" value={m.victim} icon="heart" />
        <Meter label="Company Morale" value={m.morale} icon="users" />
      </View>
    </Panel>
  );

  // Glass panels must not fade (opacity < 1 breaks Liquid Glass): slide in on iOS 26+.
  const actions = (
    <Animated.View key={`${phase.key}-${scene.phaseIndex}`} entering={glassSafe(FadeInRight, SlideInRight.duration(260))}>
      <Panel
        title={`Phase ${scene.phaseIndex + 1}/${scene.phases.length} · ${phase.title}`}
        icon={mayday ? "alert" : "flame"}
        right={<Mono className="text-[10px] text-muted">{scene.phaseDone.length}/{needed}</Mono>}
      >
        <View className="gap-3 p-3">
          <Text className={`text-[15px] leading-6 ${mayday ? "font-semibold text-alert" : "text-ink"}`}>{phase.text}</Text>
          {scene.victimLost ? (
            <Text className="text-xs text-alert">Victim status reached zero. The patient could not be saved.</Text>
          ) : null}
          <Mono className="text-[10px] uppercase tracking-widest text-muted">
            Choose {needed - scene.phaseDone.length} more action{needed - scene.phaseDone.length === 1 ? "" : "s"}
          </Mono>
          {phase.actions.map((a, i) => {
            const done = scene.phaseDone.includes(i);
            return (
              <Pressable
                key={a.label}
                testID={`action-${i}`}
                disabled={done || !!scene.pending}
                onPress={() => {
                  haptic("tap");
                  chooseAction(incident.id, i);
                }}
                className={`min-h-[52px] flex-row items-center gap-3 rounded-lg border px-3 ${done ? "border-line bg-surface opacity-50" : mayday ? "border-alert/60 bg-alert/10 active:bg-alert/20" : "border-line bg-raised active:border-amber"}`}
              >
                <View className="h-9 w-9 items-center justify-center rounded-md bg-panel">
                  <Icon name={done ? "check" : a.icon} size={18} color={done ? "radio" : mayday ? "alert" : "amber"} />
                </View>
                <Text className="flex-1 text-sm font-semibold text-ink">{a.label}</Text>
                {!done ? <Icon name="play" size={14} color="muted" /> : null}
              </Pressable>
            );
          })}
        </View>
      </Panel>
    </Animated.View>
  );

  return (
    <Screen>
      <TopBar>
        <Pressable accessibilityLabel="Open CAD" onPress={() => router.push("/dispatch")} className="h-11 w-11 items-center justify-center rounded-lg bg-panel">
          <Icon name="headset" size={18} color="info" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-bold text-ink" numberOfLines={1}>{type.short} · {incident.address}</Text>
          <Mono className="text-[10px] uppercase tracking-widest text-muted" numberOfLines={1}>
            {unit?.name} · {scene.personRank} {scene.personName} · {ROLE_LABEL[scene.role]}
          </Mono>
        </View>
        <Mono className="text-lg font-bold text-amber">{formatClock(clock)}</Mono>
      </TopBar>
      {radio ? (
        <View className="flex-row items-center gap-2 border-b border-line bg-bg px-4 py-1.5">
          <Icon name="radio" size={12} color="radio" />
          <Mono className="flex-1 text-[11px] text-radio" numberOfLines={1}>{radio.text}</Mono>
        </View>
      ) : null}

      <SafeBody>
      <ScrollView contentContainerClassName="gap-3 p-3 w-full max-w-[1100px] self-center" contentContainerStyle={scrollPad}>
        <SceneVisual building={type.building} metrics={m} mayday={mayday} burning={type.family === "fire" || type.family === "wildland" || type.family === "marine"} />
        {wide ? (
          <View className="flex-row gap-3">
            <View className="w-[300px]">{meters}</View>
            <View className="flex-1">{actions}</View>
          </View>
        ) : (
          <>
            {meters}
            {actions}
          </>
        )}
        <Panel title="Leave the incident" icon="headset">
          <View className="gap-2 p-4">
            <Text className="text-sm text-muted">
              Step away before the call ends. The incident keeps running without you, you take the CAD console, and the AI dispatcher is turned off.
            </Text>
            <Button
              testID="leave-scene"
              label={confirmLeave ? "Tap again to leave and take the console" : "Leave scene → take the console"}
              icon="headset"
              tone={confirmLeave ? "primary" : "ghost"}
              onPress={() => {
                if (!confirmLeave) return setConfirmLeave(true);
                leaveScene(incident.id);
                router.replace("/dispatch");
              }}
            />
          </View>
        </Panel>
      </ScrollView>
      </SafeBody>

      <QuestionSheet
        visible={!!scene.pending}
        heading={pendingAction?.label ?? "Decision"}
        question={pendingQ}
        choice={scene.pending?.choice ?? null}
        onAnswer={(c) => answerScene(incident.id, c)}
        onContinue={() => continueScene(incident.id)}
      />
    </Screen>
  );
}
