import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Screen } from "@/components/glass";
import { Icon } from "@/components/icon";
import { SafeBody, TopBar, useScrollPadding } from "@/components/safe-area";
import { Button, Mono, Panel } from "@/components/ui";
import { incidentTypeById } from "@/data/incident-types";
import { questionById } from "@/data/questions";
import { sceneGrade } from "@/game/engine";
import { useGame } from "@/store/game-store";

const GRADE_TONE: Record<string, string> = { A: "text-radio", B: "text-radio", C: "text-amber", D: "text-amber", F: "text-alert" };

export default function DebriefScreen() {
  const { incidentId } = useLocalSearchParams<{ incidentId: string }>();
  const incident = useGame((s) => s.incidents.find((i) => i.id === incidentId));
  const role = useGame((s) => s.role);
  const clock = useGame((s) => s.clock);
  const playerCallAt = useGame((s) => s.playerCallAt);
  const takeConsole = useGame((s) => s.takeConsole);
  const exitToMenu = useGame((s) => s.exitToMenu);
  const scrollPad = useScrollPadding();

  const scene = incident?.scene;
  if (!incident || !scene) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-bg">
        <Text className="text-ink">Debrief unavailable.</Text>
        <Button label="Main menu" icon="home" onPress={() => router.navigate("/")} />
      </SafeAreaView>
    );
  }

  const g = sceneGrade(scene);
  const type = incidentTypeById(incident.typeId);
  const fieldRole = role !== null && role !== "dispatcher";
  const countdown = playerCallAt !== null ? Math.max(0, playerCallAt - clock) : null;
  const duration = (scene.endedAt ?? clock) - scene.startedAt;

  return (
    <Screen>
      <TopBar>
        <Icon name="clipboard" size={18} color="amber" />
        <Text className="flex-1 text-base font-bold text-ink">After-action review</Text>
        <Mono className="text-xs text-muted">{incident.number}</Mono>
      </TopBar>
      <SafeBody>
      <ScrollView contentContainerClassName="gap-4 p-4 w-full max-w-[820px] self-center" contentContainerStyle={scrollPad}>
        <View className="flex-row items-center gap-4">
          <Animated.View entering={ZoomIn.springify()}>
            <View className="h-20 w-20 items-center justify-center rounded-2xl border border-line bg-panel">
              <Text className={`text-5xl font-black ${GRADE_TONE[g.grade]}`}>{g.grade}</Text>
            </View>
          </Animated.View>
          <View className="flex-1 gap-1">
            <Text className="text-xl font-bold text-ink">{type.short}</Text>
            <Text className="text-sm text-muted">{scene.outcome}</Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          <Tile label="Decisions" value={`${g.correct}/${g.total}`} />
          <Tile label="Accuracy" value={`${Math.round(g.pct * 100)}%`} />
          <Tile label="On scene" value={`${duration}s`} />
          <Tile label="Mayday" value={scene.maydayTriggered ? "YES" : "NO"} alert={scene.maydayTriggered} />
        </View>

        {fieldRole ? (
          <Panel title="Back in service" icon="radio">
            <View className="gap-3 p-4">
              <Text className="text-sm text-ink">
                {countdown !== null
                  ? `You're available. The AI dispatcher will tone you out within ${countdown}s.`
                  : "You're available and monitoring the radio."}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <Button
                  label="Return to quarters"
                  icon="home"
                  tone="amber"
                  className="flex-1"
                  onPress={() => router.replace("/standby")}
                />
                <Button
                  label="Take the console"
                  icon="headset"
                  tone="radio"
                  className="flex-1"
                  onPress={() => {
                    takeConsole();
                    router.replace("/dispatch");
                  }}
                />
              </View>
            </View>
          </Panel>
        ) : null}

        <Mono className="px-1 text-[11px] uppercase tracking-widest text-dim">Decision review</Mono>
        {scene.answers.map((a, idx) => {
          const qn = questionById(a.questionId);
          if (!qn) return null;
          return (
            <Animated.View key={idx} entering={FadeInDown.delay(idx * 40)}>
              <View className={`gap-2 rounded-xl border p-3 ${a.correct ? "border-line bg-panel" : "border-alert/50 bg-alert/5"}`}>
                <View className="flex-row items-center gap-2">
                  <Icon name={a.correct ? "check" : "x"} size={16} color={a.correct ? "radio" : "alert"} />
                  <Mono className="flex-1 text-[10px] uppercase tracking-widest text-muted">{a.phase} · {a.action}</Mono>
                </View>
                <Text className="text-sm font-semibold leading-5 text-ink">{qn.prompt}</Text>
                {!a.correct ? <Text className="text-xs text-alert">Your answer: {qn.choices[a.choice]}</Text> : null}
                <Text className="text-xs text-radio">Correct: {qn.choices[qn.answer]}</Text>
                <Text className="text-xs leading-5 text-muted">{qn.explanation}</Text>
                <Mono className="text-[10px] text-dim">Ref: {qn.reference}</Mono>
              </View>
            </Animated.View>
          );
        })}

        <Button
          label="Exit to main menu"
          icon="home"
          onPress={() => {
            exitToMenu();
            router.navigate("/");
          }}
        />
      </ScrollView>
      </SafeBody>
    </Screen>
  );
}

function Tile({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <View className="flex-1 gap-1 rounded-xl border border-line bg-panel p-3">
      <Mono className="text-[9px] uppercase tracking-widest text-dim">{label}</Mono>
      <Text className={`text-base font-bold ${alert ? "text-alert" : "text-ink"}`}>{value}</Text>
    </View>
  );
}
