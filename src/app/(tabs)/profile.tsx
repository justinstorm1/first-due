import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/glass";
import { Icon } from "@/components/icon";
import { SafeBody, TAB_SCROLL_PADDING, TopBar } from "@/components/safe-area";
import { Button, Chip, Mono, Panel } from "@/components/ui";
import { questionById } from "@/data/questions";
import { CERTS, errorRate, rankFor } from "@/game/engine";
import type { ActivityEntry, ActivityKind, IconName, Role, Track } from "@/game/types";
import { useGame } from "@/store/game-store";
import { colors } from "@/theme/colors";

const TRACK_LABEL: Record<Track, string> = {
  dispatch: "Telecommunicator",
  ff1: "Fire Fighter I",
  ff2: "Fire Fighter II",
  officer: "Fire Officer",
  chief: "Adv. Tactics / Chief",
};
const ROLE_LABEL: Record<Role, string> = { dispatcher: "Dispatcher", ff: "Firefighter", officer: "Officer", chief: "Chief" };

type Filter = "all" | "answer" | "incident" | "dispatch" | "career";
const FILTERS: { key: Filter; label: string; kinds: ActivityKind[] }[] = [
  { key: "all", label: "Everything", kinds: [] },
  { key: "answer", label: "Questions", kinds: ["answer"] },
  { key: "incident", label: "Incidents", kinds: ["incident", "left-scene"] },
  { key: "dispatch", label: "Dispatches", kinds: ["dispatch"] },
  { key: "career", label: "Career", kinds: ["cert", "writeup", "session", "profile"] },
];
const KIND_ICON: Record<ActivityKind, IconName> = {
  session: "radio",
  answer: "clipboard",
  dispatch: "headset",
  incident: "flame",
  cert: "award",
  writeup: "alert",
  "left-scene": "arrow-left",
  profile: "user",
};

const PAGE = 40;

function duration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m ${sec % 60}s`;
}

export default function ProfileScreen() {
  const scrollPad = TAB_SCROLL_PADDING;
  const profile = useGame((s) => s.profile);
  const duty = useGame((s) => s.duty);
  const setName = useGame((s) => s.setName);
  const resetCareer = useGame((s) => s.resetCareer);
  const [name, setLocalName] = useState(profile.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);
  const [historyShown, setHistoryShown] = useState(10);

  const kinds = FILTERS.find((f) => f.key === filter)!.kinds;
  const activity = kinds.length ? profile.activity.filter((a) => kinds.includes(a.kind)) : profile.activity;
  const answered = Object.values(profile.tracks).reduce((s, t) => s + t.answered, 0);
  const correct = Object.values(profile.tracks).reduce((s, t) => s + t.correct, 0);
  const dispatches = profile.activity.filter((a) => a.kind === "dispatch").length;
  const drills = profile.activity.filter((a) => a.kind === "answer" && a.context === "Practice exam").length;
  const incidents = Object.values(profile.incidentsByRole).reduce((s, n) => s + n, 0);
  const onDuty = (r: Role) => profile.timeOnDuty[r] + duty[r];

  return (
    <Screen>
      <TopBar>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-panel">
          <Icon name="user" size={18} color="amber" />
        </View>
        <Text className="flex-1 text-base font-bold text-ink">Profile & Record</Text>
      </TopBar>
      <SafeBody>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-4 p-4 w-full max-w-[820px] self-center" contentContainerStyle={scrollPad}>
        <Panel>
          <View className="items-center gap-2 p-5">
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
              className="min-h-[44px] w-60 rounded-xl border border-line bg-surface px-3 text-center text-base text-ink"
            />
            <Mono className="text-[10px] text-dim">Member since {profile.createdAt.slice(0, 10)}</Mono>
          </View>
        </Panel>

        <Panel title="Lifetime totals" icon="activity">
          <View className="flex-row flex-wrap gap-y-3 p-4">
            <Stat label="Standing" value={`${Math.round(profile.standing)}/100`} />
            <Stat label="XP" value={profile.xp.toLocaleString("en-US")} />
            <Stat label="Error rate" value={`${Math.round(errorRate(profile) * 100)}%`} />
            <Stat label="Questions" value={`${correct}/${answered}`} />
            <Stat label="Practice answers" value={String(drills)} />
            <Stat label="Dispatches" value={String(dispatches)} />
            <Stat label="Incidents run" value={String(incidents)} />
            <Stat label="Write-ups" value={String(profile.writeUps.length)} />
            <Stat label="Activity items" value={profile.activity.length.toLocaleString("en-US")} />
          </View>
          <View className="gap-1.5 border-t border-white/5 px-4 py-3">
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <View key={r} className="flex-row items-center">
                <Text className="flex-1 text-sm text-ink">{ROLE_LABEL[r]}</Text>
                <Mono className="text-xs text-muted">
                  {r === "dispatcher" ? "" : `${profile.incidentsByRole[r]} incidents · `}
                  {duration(onDuty(r))} on duty
                </Mono>
              </View>
            ))}
          </View>
        </Panel>

        <Panel title="Certificates" icon="award">
          <View className="gap-2 p-3">
            {CERTS.map((c) => {
              const rec = profile.certificates[c.id];
              const t = profile.tracks[c.track];
              const acc = t.answered ? Math.round((t.correct / t.answered) * 100) : 0;
              const prereqMissing = c.requires.filter((r) => profile.certificates[r]?.status !== "earned");
              const earned = rec?.status === "earned";
              const revoked = rec?.status === "revoked";
              return (
                <View key={c.id} className={`gap-1 rounded-2xl border p-3 ${earned ? "border-amber bg-amber/10" : revoked ? "border-alert/60 bg-alert/10" : "border-line bg-surface"}`}>
                  <View className="flex-row items-center gap-2">
                    <Icon name={earned ? "award" : revoked ? "x" : "file"} size={18} color={earned ? "amber" : revoked ? "alert" : "dim"} />
                    <Text className={`flex-1 text-sm font-bold ${earned ? "text-amber" : "text-ink"}`}>{c.title}</Text>
                    <Mono className={`text-[10px] ${earned ? "text-amber" : revoked ? "text-alert" : "text-dim"}`}>
                      {earned ? `ISSUED ${rec.date}` : revoked ? `REVOKED ${rec.date}` : "IN PROGRESS"}
                    </Mono>
                  </View>
                  <Mono className="text-[10px] text-muted">Training record · {c.standard}</Mono>
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
          <View className="gap-2 p-4">
            {(Object.keys(TRACK_LABEL) as Track[]).map((k) => {
              const t = profile.tracks[k];
              const recent = t.recent.length ? Math.round((t.recent.filter(Boolean).length / t.recent.length) * 100) : 0;
              return (
                <View key={k} className="flex-row items-center gap-2">
                  <Text className="flex-1 text-sm text-ink">{TRACK_LABEL[k]}</Text>
                  <Mono className="text-xs text-muted">{t.correct}/{t.answered}</Mono>
                  <Mono className={`w-20 text-right text-xs ${recent < 60 && t.recent.length >= 5 ? "text-alert" : "text-radio"}`}>last20 {recent}%</Mono>
                </View>
              );
            })}
          </View>
        </Panel>

        <Panel title={`Incident history · ${profile.history.length}`} icon="flame">
          <View className="gap-2 p-4">
            {profile.history.length === 0 ? <Text className="text-sm text-dim">No incidents yet.</Text> : null}
            {profile.history.slice(0, historyShown).map((h) => (
              <View key={h.incidentId} className="flex-row items-center gap-2">
                <Mono className="w-6 text-sm font-bold text-amber">{h.grade}</Mono>
                <View className="flex-1">
                  <Text className="text-xs text-ink" numberOfLines={1}>{h.number} · {h.typeLabel} · {ROLE_LABEL[h.role]}</Text>
                  <Text className="text-[11px] text-dim" numberOfLines={1}>{h.outcome}</Text>
                </View>
                <Mono className="text-[10px] text-muted">{h.correct}/{h.total} · {h.date}</Mono>
              </View>
            ))}
            {profile.history.length > historyShown ? (
              <Button small label={`Show more (${profile.history.length - historyShown})`} onPress={() => setHistoryShown((n) => n + 25)} />
            ) : null}
          </View>
        </Panel>

        <Panel title={`Administrative file · ${profile.writeUps.length}`} icon="alert">
          <View className="gap-2 p-4">
            {profile.writeUps.length === 0 ? <Text className="text-sm text-dim">Clean record.</Text> : null}
            {profile.writeUps.map((w) => (
              <View key={w.id} className="flex-row gap-2">
                <Mono className={`text-[10px] ${w.severity === "revocation" ? "text-alert" : "text-amber"}`}>{w.severity.toUpperCase()}</Mono>
                <Text className="flex-1 text-xs text-ink">{w.reason}</Text>
                <Mono className="text-[10px] text-dim">{w.date}</Mono>
              </View>
            ))}
          </View>
        </Panel>

        <Panel title={`Activity log · ${activity.length.toLocaleString("en-US")}`} icon="file">
          <View className="gap-3 p-4">
            <View className="flex-row flex-wrap gap-2">
              {FILTERS.map((f) => (
                <Chip key={f.key} label={f.label} tone="amber" selected={filter === f.key} onPress={() => { setFilter(f.key); setShown(PAGE); }} />
              ))}
            </View>
            {activity.length === 0 ? <Text className="text-sm text-dim">Nothing here yet.</Text> : null}
            {activity.slice(0, shown).map((a) => <ActivityRow key={a.id} a={a} />)}
            {activity.length > shown ? (
              <Button small label={`Show more (${(activity.length - shown).toLocaleString("en-US")})`} onPress={() => setShown((n) => n + PAGE * 2)} />
            ) : null}
          </View>
        </Panel>

        <Button
          label={confirmReset ? "Tap again to erase this profile's record" : "Reset this profile"}
          icon="alert"
          tone={confirmReset ? "primary" : "ghost"}
          onPress={() => {
            if (!confirmReset) return setConfirmReset(true);
            resetCareer();
            setConfirmReset(false);
          }}
        />
        <Button testID="switch-profile" label="Switch profile" icon="users" tone="amber" onPress={() => router.push("/profiles")} />
      </ScrollView>
      </SafeBody>
    </Screen>
  );
}

function ActivityRow({ a }: { a: ActivityEntry }) {
  const q = a.questionId ? questionById(a.questionId) : undefined;
  const tone = a.correct === undefined ? "muted" : a.correct ? "radio" : "alert";
  return (
    <View className="flex-row gap-3">
      <View className="items-center pt-0.5">
        <Icon name={a.kind === "answer" ? (a.correct ? "check" : "x") : KIND_ICON[a.kind]} size={14} color={tone} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-xs leading-4 text-ink" numberOfLines={3}>{a.text}</Text>
        {q && !a.correct ? <Text className="text-[11px] text-radio" numberOfLines={2}>Answer: {q.choices[q.answer]}</Text> : null}
        <Mono className="text-[10px] text-dim">
          {new Date(a.at).toLocaleString()}{a.context ? ` · ${a.context}` : ""}
        </Mono>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/3 gap-0.5">
      <Mono className="text-[10px] uppercase tracking-widest text-dim">{label}</Mono>
      <Text className="text-sm font-semibold text-ink" numberOfLines={1}>{value}</Text>
    </View>
  );
}
