import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";

import { Screen } from "@/components/glass";
import { Icon } from "@/components/icon";
import { SafeBody, TAB_SCROLL_PADDING, TopBar } from "@/components/safe-area";
import { Button, Chip, haptic, Mono, Panel } from "@/components/ui";
import { QUESTIONS, questionById } from "@/data/questions";
import type { Track } from "@/game/types";
import { useGame } from "@/store/game-store";

const TRACKS: { key: Track | "all"; label: string }[] = [
  { key: "all", label: "All tracks" },
  { key: "dispatch", label: "Telecommunicator" },
  { key: "ff1", label: "Fire Fighter I" },
  { key: "ff2", label: "Fire Fighter II" },
  { key: "officer", label: "Fire Officer" },
  { key: "chief", label: "Adv. Tactics / Chief" },
];
const LENGTHS = [10, 25, 50, 100];
const LETTERS = ["A", "B", "C", "D"];

function sample(track: Track | "all", n: number) {
  const pool = QUESTIONS.filter((q) => track === "all" || q.level === track);
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n).map((q) => q.id);
}

export default function DrillScreen() {
  const scrollPad = TAB_SCROLL_PADDING;
  const answerDrill = useGame((s) => s.answerDrill);
  const [track, setTrack] = useState<Track | "all">("all");
  const [length, setLength] = useState(25);
  const [ids, setIds] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [results, setResults] = useState<{ id: string; choice: number; correct: boolean }[]>([]);

  const poolSize = QUESTIONS.filter((q) => track === "all" || q.level === track).length;
  const done = ids !== null && index >= ids.length;
  const q = ids && !done ? questionById(ids[index]) : undefined;

  const start = () => {
    setIds(sample(track, length));
    setIndex(0);
    setChoice(null);
    setResults([]);
  };

  const answer = (i: number) => {
    if (!q || choice !== null) return;
    setChoice(i);
    const correct = answerDrill(q.id, i);
    haptic(correct ? "success" : "error");
    setResults((r) => [...r, { id: q.id, choice: i, correct }]);
  };

  const score = results.filter((r) => r.correct).length;

  return (
    <Screen>
      <TopBar>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-panel">
          <Icon name="clipboard" size={18} color="amber" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-ink">Practice Exam</Text>
          <Mono className="text-[10px] uppercase tracking-widest text-muted">
            {ids && !done ? `Question ${index + 1} of ${ids.length} · ${score} correct` : `${QUESTIONS.length.toLocaleString("en-US")} questions in the bank`}
          </Mono>
        </View>
      </TopBar>

      <SafeBody>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-4 p-4 w-full max-w-[760px] self-center" contentContainerStyle={scrollPad}>
        {ids === null ? (
          <Panel title="Set up your exam" icon="clipboard">
            <View className="gap-4 p-4">
              <View className="gap-2">
                <Mono className="text-[11px] uppercase tracking-widest text-dim">Track</Mono>
                <View className="flex-row flex-wrap gap-2">
                  {TRACKS.map((t) => (
                    <Chip key={t.key} label={t.label} tone="amber" selected={track === t.key} onPress={() => setTrack(t.key)} />
                  ))}
                </View>
              </View>
              <View className="gap-2">
                <Mono className="text-[11px] uppercase tracking-widest text-dim">Length</Mono>
                <View className="flex-row flex-wrap gap-2">
                  {LENGTHS.map((n) => (
                    <Chip key={n} label={`${n} questions`} tone="amber" selected={length === n} onPress={() => setLength(n)} />
                  ))}
                </View>
              </View>
              <Text className="text-sm text-muted">{poolSize.toLocaleString("en-US")} questions available. Results count toward your certificates and error rate.</Text>
              <Button testID="drill-start" label="Start exam" icon="play" tone="amber" onPress={start} />
            </View>
          </Panel>
        ) : done ? (
          <>
            <Panel title="Results" icon="award">
              <View className="items-center gap-2 p-6">
                <Text className={`text-5xl font-black ${score / ids.length >= 0.7 ? "text-radio" : "text-alert"}`}>
                  {Math.round((score / Math.max(1, ids.length)) * 100)}%
                </Text>
                <Text className="text-sm text-muted">{score} of {ids.length} correct · NJ written exams typically require 70%</Text>
                <View className="w-full flex-row gap-2 pt-2">
                  <Button className="flex-1" label="New exam" icon="play" tone="amber" onPress={() => setIds(null)} />
                  <Button className="flex-1" label="Home" icon="home" onPress={() => router.navigate("/")} />
                </View>
              </View>
            </Panel>
            <Mono className="px-1 text-[11px] uppercase tracking-widest text-dim">Missed questions</Mono>
            {results.filter((r) => !r.correct).map((r) => {
              const mq = questionById(r.id)!;
              return (
                <View key={r.id} className="gap-1.5 rounded-2xl border border-alert/40 bg-alert/5 p-3">
                  <Text className="text-sm font-semibold text-ink">{mq.prompt}</Text>
                  <Text className="text-xs text-alert">Your answer: {mq.choices[r.choice]}</Text>
                  <Text className="text-xs text-radio">Correct: {mq.choices[mq.answer]}</Text>
                  <Text className="text-xs text-muted">{mq.explanation}</Text>
                  <Mono className="text-[10px] text-dim">Ref: {mq.reference}</Mono>
                </View>
              );
            })}
          </>
        ) : q ? (
          <Animated.View key={q.id} entering={FadeInRight}>
          <View className="gap-4">
            <View className="h-1.5 overflow-hidden rounded-full bg-raised">
              <View className="h-full rounded-full bg-amber" style={{ width: `${(index / ids.length) * 100}%` }} />
            </View>
            <Mono className="pt-1 text-[10px] uppercase tracking-widest text-dim">{q.level} · {q.topic}</Mono>
            <Text className="text-lg leading-7 text-ink">{q.prompt}</Text>
            <View className="gap-2.5">
            {q.choices.map((c, i) => {
              const answered = choice !== null;
              const state = !answered
                ? "border-line bg-panel active:bg-raised web:hover:bg-raised"
                : i === q.answer
                  ? "border-radio bg-radio/15"
                  : i === choice
                    ? "border-alert bg-alert/15"
                    : "border-line bg-panel opacity-50";
              return (
                <Pressable
                  key={i}
                  testID={`drill-choice-${i}`}
                  disabled={answered}
                  onPress={() => answer(i)}
                  className={`min-h-[52px] flex-row items-center gap-3 rounded-2xl border px-3 py-3 web:rounded-lg ${state}`}
                >
                  <View className="h-7 w-7 items-center justify-center rounded-lg bg-raised">
                    <Mono className="text-xs font-bold text-muted">{LETTERS[i]}</Mono>
                  </View>
                  <Text className="flex-1 text-[15px] leading-5 text-ink">{c}</Text>
                </Pressable>
              );
            })}
            </View>
            {choice !== null ? (
              <View className="gap-3">
                <View className={`gap-1.5 rounded-2xl border p-3 ${choice === q.answer ? "border-radio/50 bg-radio/10" : "border-alert/50 bg-alert/10"}`}>
                  <Text className={`text-sm font-bold ${choice === q.answer ? "text-radio" : "text-alert"}`}>{choice === q.answer ? "Correct" : "Incorrect"}</Text>
                  <Text className="text-sm leading-5 text-ink">{q.explanation}</Text>
                  <Mono className="text-[11px] text-muted">Ref: {q.reference}</Mono>
                </View>
                <Button
                  testID="drill-next"
                  label={index + 1 >= ids.length ? "See results" : "Next question"}
                  icon="play"
                  tone="amber"
                  onPress={() => {
                    setIndex((n) => n + 1);
                    setChoice(null);
                  }}
                />
              </View>
            ) : null}
          </View>
          </Animated.View>
        ) : null}
      </ScrollView>
      </SafeBody>
    </Screen>
  );
}
