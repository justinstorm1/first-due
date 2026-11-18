import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Icon } from "@/components/icon";
import { TopBar, useScrollPadding } from "@/components/safe-area";
import { Button, Mono, Panel } from "@/components/ui";
import { CERTS, errorRate, rankFor } from "@/game/engine";
import type { Track } from "@/game/types";
import { useGame } from "@/store/game-store";
import { colors } from "@/theme/colors";

const TRACK_LABEL: Record<Track, string> = {
  dispatch: "Telecommunicator",
  ff1: "Fire Fighter I",
  ff2: "Fire Fighter II",
  officer: "Fire Officer",
  chief: "Adv. Tactics / Chief",
};

export default function ProfileScreen() {
  const profile = useGame((s) => s.profile);
  const setName = useGame((s) => s.setName);
  const resetCareer = useGame((s) => s.resetCareer);
  const [name, setLocalName] = useState(profile.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const scrollPad = useScrollPadding();

  return (
    <View className="flex-1 bg-bg">
      <TopBar>
        <Pressable accessibilityLabel="Close" onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-lg bg-panel">
          <Icon name="x" size={18} />
        </Pressable>
        <Text className="flex-1 text-base font-bold text-ink">Career & Certificates</Text>
      </TopBar>
      <ScrollView contentContainerClassName="gap-4 p-4 w-full max-w-[820px] self-center" contentContainerStyle={scrollPad}>
        <View className="items-center gap-2 rounded-2xl border border-amber/40 bg-panel p-5">
          <View className="h-16 w-16 items-center justify-center rounded-full border-2 border-amber bg-amber/15">
            <Icon name="shield" size={30} color="amber" />
          </View>
          <Text className="text-lg font-black text-ink">{rankFor(profile)}</Text>
          <TextInput
            value={name}
            onChangeText={setLocalName}
            onBlur={() => setName(name)}
            onSubmitEditing={() => setName(name)}
            placeholder="Your name"
            placeholderTextColor={colors.dim}
            className="min-h-[44px] w-60 rounded-lg border border-line bg-surface px-3 text-center text-base text-ink"
          />
          <View className="flex-row gap-6 pt-1">
            <Mono className="text-xs text-muted">STANDING {Math.round(profile.standing)}</Mono>
            <Mono className="text-xs text-muted">ERR {Math.round(errorRate(profile) * 100)}%</Mono>
            <Mono className="text-xs text-muted">XP {profile.xp}</Mono>
          </View>
        </View>

        <Panel title="Certificates" icon="award">
          <View className="gap-2 p-2">
            {CERTS.map((c) => {
              const rec = profile.certificates[c.id];
              const t = profile.tracks[c.track];
              const acc = t.answered ? Math.round((t.correct / t.answered) * 100) : 0;
              const prereqMissing = c.requires.filter((r) => profile.certificates[r]?.status !== "earned");
              const earned = rec?.status === "earned";
              const revoked = rec?.status === "revoked";
              return (
                <View
                  key={c.id}
                  className={`gap-1 rounded-xl border p-3 ${earned ? "border-amber bg-amber/10" : revoked ? "border-alert/60 bg-alert/10" : "border-line bg-surface"}`}
                >
                  <View className="flex-row items-center gap-2">
                    <Icon name={earned ? "award" : revoked ? "x" : "file"} size={18} color={earned ? "amber" : revoked ? "alert" : "dim"} />
                    <Text className={`flex-1 text-sm font-bold ${earned ? "text-amber" : "text-ink"}`}>{c.title}</Text>
                    <Mono className={`text-[10px] ${earned ? "text-amber" : revoked ? "text-alert" : "text-dim"}`}>
                      {earned ? `ISSUED ${rec.date}` : revoked ? "REVOKED" : "IN PROGRESS"}
                    </Mono>
                  </View>
                  <Mono className="text-[10px] text-muted">State of New Jersey · Training record · {c.standard}</Mono>
                  {!earned ? (
                    <Text className="text-xs text-muted">
                      {t.answered}/{c.min} questions · {acc}% (need {Math.round(c.pct * 100)}%)
                      {prereqMissing.length ? ` · Requires ${prereqMissing.map((r) => CERTS.find((x) => x.id === r)?.title).join(", ")}` : ""}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </Panel>

        <Panel title="Exam tracks" icon="clipboard">
          <View className="gap-2 p-3">
            {(Object.keys(TRACK_LABEL) as Track[]).map((k) => {
              const t = profile.tracks[k];
              const recent = t.recent.length ? Math.round((t.recent.filter(Boolean).length / t.recent.length) * 100) : 0;
              return (
                <View key={k} className="flex-row items-center gap-2">
                  <Text className="flex-1 text-sm text-ink">{TRACK_LABEL[k]}</Text>
                  <Mono className="text-xs text-muted">{t.correct}/{t.answered}</Mono>
                  <Mono className={`w-20 text-right text-xs ${recent < 60 && t.recent.length >= 5 ? "text-alert" : "text-radio"}`}>
                    last20 {recent}%
                  </Mono>
                </View>
              );
            })}
          </View>
        </Panel>

        <Panel title={`Administrative file · ${profile.writeUps.length}`} icon="alert">
          <View className="gap-2 p-3">
            {profile.writeUps.length === 0 ? <Text className="text-sm text-dim">Clean record.</Text> : null}
            {profile.writeUps.slice(0, 15).map((w) => (
              <View key={w.id} className="flex-row gap-2">
                <Mono className={`text-[10px] ${w.severity === "revocation" ? "text-alert" : "text-amber"}`}>{w.severity.toUpperCase()}</Mono>
                <Text className="flex-1 text-xs text-ink">{w.reason}</Text>
                <Mono className="text-[10px] text-dim">{w.date}</Mono>
              </View>
            ))}
          </View>
        </Panel>

        <Panel title="Incident history" icon="file">
          <View className="gap-2 p-3">
            {profile.history.length === 0 ? <Text className="text-sm text-dim">No incidents yet.</Text> : null}
            {profile.history.map((h) => (
              <View key={h.incidentId} className="flex-row items-center gap-2">
                <Mono className="w-6 text-sm font-bold text-amber">{h.grade}</Mono>
                <Text className="flex-1 text-xs text-ink" numberOfLines={1}>{h.typeLabel} · {h.role.toUpperCase()}</Text>
                <Mono className="text-[10px] text-muted">{h.correct}/{h.total}</Mono>
              </View>
            ))}
          </View>
        </Panel>

        <Button
          label={confirmReset ? "Tap again to erase career" : "Reset career"}
          icon="alert"
          tone={confirmReset ? "primary" : "ghost"}
          onPress={() => {
            if (!confirmReset) return setConfirmReset(true);
            resetCareer();
            setLocalName("Probie");
            setConfirmReset(false);
          }}
        />
      </ScrollView>
    </View>
  );
}
