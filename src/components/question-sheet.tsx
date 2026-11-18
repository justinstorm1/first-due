import { useEffect } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Question } from "@/game/types";
import { RADIUS, Surface } from "./glass";
import { Icon } from "./icon";
import { Button, haptic, Mono } from "./ui";

const LETTERS = ["A", "B", "C", "D"];
const TRACK_LABEL = { dispatch: "Telecommunicator", ff1: "Fire Fighter I", ff2: "Fire Fighter II", officer: "Fire Officer", chief: "Adv. Tactics / Chief" };

export function QuestionSheet({ visible, heading, question, choice, onAnswer, onContinue, continueLabel = "Continue" }: {
  visible: boolean;
  heading: string;
  question: Question | undefined;
  choice: number | null;
  onAnswer: (i: number) => void;
  onContinue: () => void;
  continueLabel?: string;
}) {
  const answered = choice !== null;
  const correct = answered && question?.answer === choice;

  useEffect(() => {
    if (answered) haptic(correct ? "success" : "error");
  }, [answered, correct]);

  if (!question) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (answered) onContinue(); }}>
      <View className="flex-1 justify-end bg-black/70">
        <Surface radius={RADIUS.sheet} topOnly className="max-h-[88%] w-full max-w-[720px] self-center border border-line bg-surface">
        <SafeAreaView edges={["bottom", "left", "right"]} className="shrink">
          <View className="shrink pb-4">
          <View className="flex-row items-center gap-2 border-b border-line px-4 py-3">
            <Icon name="clipboard" size={16} color="amber" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-ink">{heading}</Text>
              <Mono className="text-[10px] uppercase tracking-widest text-dim">
                {TRACK_LABEL[question.level]} · {question.topic}
              </Mono>
            </View>
          </View>
          <ScrollView contentContainerClassName="gap-3 p-4">
            <Text className="text-base leading-6 text-ink">{question.prompt}</Text>
            {question.choices.map((c, i) => {
              const isAnswer = i === question.answer;
              const isPicked = i === choice;
              const state = !answered
                ? "border-line bg-panel active:bg-raised"
                : isAnswer
                  ? "border-radio bg-radio/15"
                  : isPicked
                    ? "border-alert bg-alert/15"
                    : "border-line bg-panel opacity-50";
              return (
                <Pressable
                  key={i}
                  testID={`choice-${i}`}
                  disabled={answered}
                  onPress={() => onAnswer(i)}
                  className={`min-h-[48px] flex-row items-center gap-3 rounded-lg border px-3 py-3 ${state}`}
                >
                  <View className="h-7 w-7 items-center justify-center rounded-md bg-raised">
                    <Mono className="text-xs font-bold text-muted">{LETTERS[i]}</Mono>
                  </View>
                  <Text className="flex-1 text-sm leading-5 text-ink">{c}</Text>
                  {answered && isAnswer ? <Icon name="check" size={16} color="radio" /> : null}
                  {answered && isPicked && !isAnswer ? <Icon name="x" size={16} color="alert" /> : null}
                </Pressable>
              );
            })}
            {answered ? (
              <View className={`gap-2 rounded-lg border p-3 ${correct ? "border-radio/50 bg-radio/10" : "border-alert/50 bg-alert/10"}`}>
                <Text className={`text-sm font-bold ${correct ? "text-radio" : "text-alert"}`}>
                  {correct ? "Correct: good decision." : "Incorrect: this will be on your record."}
                </Text>
                <Text className="text-sm leading-5 text-ink">{question.explanation}</Text>
                <Mono className="text-[11px] text-muted">Ref: {question.reference}</Mono>
              </View>
            ) : null}
          </ScrollView>
          {answered ? (
            <View className="px-4 pt-2">
              <Button testID="continue" label={continueLabel} tone="amber" icon="play" onPress={onContinue} />
            </View>
          ) : null}
        </View>
          </SafeAreaView>
        </Surface>
      </View>
    </Modal>
  );
}
