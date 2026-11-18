import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { CallDetail, CallQueue, LogFeed, TownMap, UnitsBoard } from "@/components/cad";
import { Icon } from "@/components/icon";
import { BottomBar, TopBar, useScrollPadding } from "@/components/safe-area";
import { QuestionSheet } from "@/components/question-sheet";
import { Button, haptic, Mono, StatusDot } from "@/components/ui";
import { questionById } from "@/data/questions";
import { formatClock } from "@/game/engine";
import type { IconName } from "@/game/types";
import { useGame } from "@/store/game-store";

type Tab = "queue" | "call" | "units" | "map" | "log";
const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: "queue", label: "Queue", icon: "siren" },
  { key: "call", label: "Call", icon: "clipboard" },
  { key: "units", label: "Units", icon: "truck" },
  { key: "map", label: "Map", icon: "map" },
  { key: "log", label: "Log", icon: "radio" },
];

export default function DispatchScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const clock = useGame((s) => s.clock);
  const role = useGame((s) => s.role);
  const incidents = useGame((s) => s.incidents);
  const units = useGame((s) => s.units);
  const log = useGame((s) => s.log);
  const dq = useGame((s) => s.dispatchQuestion);
  const dispatchIncident = useGame((s) => s.dispatchIncident);
  const takeRole = useGame((s) => s.takeRole);
  const returnToDispatch = useGame((s) => s.returnToDispatch);
  const answerDQ = useGame((s) => s.answerDispatchQuestion);
  const closeDQ = useGame((s) => s.closeDispatchQuestion);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("queue");
  const scrollPad = useScrollPadding(16);

  const pending = incidents.filter((i) => i.status === "pending");
  const selected = incidents.find((i) => i.id === selectedId) ?? pending[0];
  const myScene = incidents.find((i) => i.scene?.status === "active");
  const isDispatcher = role === "dispatcher";

  const select = (id: string) => {
    setSelectedId(id);
    if (!wide) setTab("call");
  };

  const playRole = (incidentId: string, unitId: string, crewId: string) => {
    haptic("warning");
    takeRole(incidentId, unitId, crewId);
    router.push({ pathname: "/scene/[incidentId]", params: { incidentId } });
  };

  const detail = (
    <CallDetail
      incident={selected}
      units={units}
      clock={clock}
      canPlayRole={!myScene}
      onDispatch={(cls, ids) => {
        if (!selected) return;
        haptic("success");
        setSelectedId(selected.id);
        dispatchIncident(selected.id, cls, ids);
      }}
      onPlayRole={(unitId, crewId) => selected && playRole(selected.id, unitId, crewId)}
    />
  );

  const question = dq ? questionById(dq.questionId) : undefined;

  return (
    <View className="flex-1 bg-bg">
      <TopBar>
        <Pressable accessibilityLabel="Main menu" onPress={() => router.navigate("/")} className="h-11 w-11 items-center justify-center rounded-lg bg-panel">
          <Icon name="home" size={18} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-bold text-ink">CAD · Middletown Fire</Text>
          <View className="flex-row items-center gap-1.5">
            <StatusDot tone={isDispatcher ? "radio" : "info"} />
            <Mono className="text-[10px] uppercase tracking-widest text-muted">
              {isDispatcher ? "You have the console" : "AI dispatcher active"}
            </Mono>
          </View>
        </View>
        <View className="items-end">
          <Mono className="text-lg font-bold text-amber">{formatClock(clock)}</Mono>
          <Mono className="text-[10px] text-dim">{pending.length} PENDING</Mono>
        </View>
      </TopBar>

      {!isDispatcher ? (
        <View className="flex-row items-center gap-3 border-b border-info/40 bg-info/10 px-4 py-2">
          <Icon name="headset" size={16} color="info" />
          <Text className="flex-1 text-xs text-ink">
            {myScene ? "You're assigned on scene. The AI is handling town traffic." : "The AI is dispatching while you're in a field role."}
          </Text>
          {myScene ? (
            <Button small label="To scene" icon="flame" tone="amber" onPress={() => router.push({ pathname: "/scene/[incidentId]", params: { incidentId: myScene.id } })} />
          ) : (
            <Button small label="Take console" icon="headset" tone="radio" onPress={returnToDispatch} />
          )}
        </View>
      ) : null}

      {wide ? (
        <View className="flex-1 flex-row gap-3 px-3 pt-3">
          <ScrollView className="w-[300px] flex-none" contentContainerStyle={scrollPad}>
            <CallQueue incidents={incidents} clock={clock} selectedId={selected?.id ?? null} onSelect={select} />
          </ScrollView>
          <ScrollView className="flex-1" contentContainerStyle={scrollPad}>{detail}</ScrollView>
          <ScrollView className="w-[340px] flex-none" contentContainerClassName="gap-3" contentContainerStyle={scrollPad}>
            <TownMap units={units} incidents={incidents} />
            <UnitsBoard units={units} />
            <LogFeed log={log} />
          </ScrollView>
        </View>
      ) : (
        <>
          <ScrollView className="flex-1" contentContainerClassName="gap-3 p-3 pb-6">
            {tab === "queue" ? <CallQueue incidents={incidents} clock={clock} selectedId={selected?.id ?? null} onSelect={select} /> : null}
            {tab === "call" ? detail : null}
            {tab === "units" ? <UnitsBoard units={units} /> : null}
            {tab === "map" ? <TownMap units={units} incidents={incidents} /> : null}
            {tab === "log" ? <LogFeed log={log} limit={80} /> : null}
          </ScrollView>
          <BottomBar>
            {TABS.map((t) => {
              const on = tab === t.key;
              const badge = t.key === "queue" && pending.length > 0;
              return (
                <Pressable key={t.key} onPress={() => setTab(t.key)} className="min-h-[54px] flex-1 items-center justify-center gap-1">
                  <View>
                    <Icon name={t.icon} size={18} color={on ? "amber" : "muted"} />
                    {badge ? <View className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-alert" /> : null}
                  </View>
                  <Text className={`text-[10px] ${on ? "font-semibold text-amber" : "text-muted"}`}>{t.label}</Text>
                </Pressable>
              );
            })}
          </BottomBar>
        </>
      )}

      <QuestionSheet
        visible={!!dq && isDispatcher}
        heading="Pre-arrival / protocol check"
        question={question}
        choice={dq?.choice ?? null}
        onAnswer={answerDQ}
        onContinue={closeDQ}
        continueLabel="Back to console"
      />
    </View>
  );
}
