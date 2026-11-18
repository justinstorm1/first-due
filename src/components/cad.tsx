import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

import { incidentTypeById, INCIDENT_TYPES } from "@/data/incident-types";
import { STATIONS, stationById, UNIT_TYPE_LABEL } from "@/data/town";
import { formatClock, travelSeconds } from "@/game/engine";
import type { Incident, IncidentTypeId, LogEntry, Unit, UnitStatus } from "@/game/types";
import { Icon } from "./icon";
import { Button, Chip, Mono, Panel, StatusDot } from "./ui";

export const STATUS_LABEL: Record<UnitStatus, string> = {
  available: "AVAIL",
  dispatched: "DISP",
  enroute: "ENRT",
  onscene: "ONSC",
  returning: "RTQ",
};
const STATUS_TONE: Record<UnitStatus, "radio" | "amber" | "alert" | "info" | "dim"> = {
  available: "radio",
  dispatched: "amber",
  enroute: "amber",
  onscene: "alert",
  returning: "info",
};

const PRIORITY_TONE = { 1: "alert", 2: "amber", 3: "info" } as const;

// ───────────── Call queue ─────────────
export function CallQueue({ incidents, clock, selectedId, onSelect }: {
  incidents: Incident[];
  clock: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const open = incidents
    .filter((i) => i.status !== "closed")
    .sort((a, b) => (a.status === "pending" ? -1 : 0) - (b.status === "pending" ? -1 : 0) || b.createdAt - a.createdAt);
  return (
    <Panel title={`Call Queue · ${open.filter((i) => i.status === "pending").length} pending`} icon="siren">
      <View className="gap-2 p-2">
        {open.length === 0 ? <Text className="p-3 text-sm text-dim">No active calls. Stand by…</Text> : null}
        {open.map((i) => {
          const type = incidentTypeById(i.typeId);
          const pending = i.status === "pending";
          const age = clock - i.createdAt;
          return (
            <Animated.View key={i.id} entering={FadeIn} layout={LinearTransition}>
              <Pressable
                onPress={() => onSelect(i.id)}
                className={`gap-1 rounded-lg border p-3 ${selectedId === i.id ? "border-amber bg-raised" : pending ? "border-alert/60 bg-alert/10" : "border-line bg-surface"}`}
              >
                <View className="flex-row items-center gap-2">
                  <StatusDot tone={pending ? "alert" : PRIORITY_TONE[type.priority]} />
                  <Mono className="text-xs text-muted">{i.number}</Mono>
                  <View className="flex-1" />
                  <Mono className={`text-xs ${pending && age > 45 ? "text-alert" : "text-dim"}`}>
                    {pending ? `${age}s` : i.scene?.status === "active" ? "YOU" : i.dispatch?.by === "ai" ? "AI" : "DISP"}
                  </Mono>
                </View>
                <Text className="text-sm font-semibold text-ink">{pending ? "UNCLASSIFIED 911 CALL" : type.short}</Text>
                <Text className="text-xs text-muted" numberOfLines={1}>{i.address}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </Panel>
  );
}

// ───────────── Call detail ─────────────
export function CallDetail({ incident, units, clock, onDispatch, onPlayRole, canPlayRole }: {
  incident: Incident | undefined;
  units: Unit[];
  clock: number;
  onDispatch: (classifiedAs: IncidentTypeId, unitIds: string[]) => void;
  onPlayRole: (unitId: string, crewId: string) => void;
  canPlayRole: boolean;
}) {
  if (!incident) {
    return (
      <Panel title="Call Detail" icon="clipboard">
        <View className="items-center gap-2 p-8">
          <Icon name="headset" size={32} color="dim" />
          <Text className="text-center text-sm text-dim">Select a call from the queue.</Text>
        </View>
      </Panel>
    );
  }
  return incident.status === "pending" ? (
    <PendingCall key={incident.id} incident={incident} units={units} clock={clock} onDispatch={onDispatch} />
  ) : (
    <ActiveCall incident={incident} units={units} onPlayRole={onPlayRole} canPlayRole={canPlayRole} />
  );
}

function Transcript({ lines }: { lines: string[] }) {
  return (
    <View className="gap-2">
      {lines.map((l, idx) => {
        const caller = idx % 2 === 1;
        return (
          <View key={idx} className={`max-w-[90%] rounded-lg px-3 py-2 ${caller ? "self-end bg-raised" : "self-start border border-line bg-surface"}`}>
            <Mono className="text-[9px] uppercase tracking-widest text-dim">{caller ? "Caller" : "Call-taker"}</Mono>
            <Text className="text-sm leading-5 text-ink">{l}</Text>
          </View>
        );
      })}
    </View>
  );
}

function PendingCall({ incident, units, clock, onDispatch }: {
  incident: Incident;
  units: Unit[];
  clock: number;
  onDispatch: (classifiedAs: IncidentTypeId, unitIds: string[]) => void;
}) {
  const [classified, setClassified] = useState<IncidentTypeId | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const available = units
    .filter((u) => u.status === "available")
    .sort((a, b) => travelSeconds(a, incident.zone) - travelSeconds(b, incident.zone));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Panel
      title={`${incident.number} · Intake`}
      icon="headset"
      right={<Mono className="text-xs text-alert">{clock - incident.createdAt}s</Mono>}
    >
      <View className="gap-4 p-3">
        <Transcript lines={incident.transcript} />
        <View className="flex-row items-start gap-2 rounded-lg border border-line bg-surface p-3">
          <Icon name="map" size={16} color="info" />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-ink">{incident.address}</Text>
            <Text className="text-xs text-muted">
              {incident.note} · First due: Station {incident.zone} {stationById(incident.zone).name}
            </Text>
          </View>
        </View>

        <View className="gap-2">
          <Mono className="text-[11px] uppercase tracking-widest text-muted">1 · Classify incident</Mono>
          <View className="flex-row flex-wrap gap-2">
            {INCIDENT_TYPES.map((t) => (
              <Chip key={t.id} label={t.short} selected={classified === t.id} onPress={() => setClassified(t.id)} tone="amber" />
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Mono className="text-[11px] uppercase tracking-widest text-muted">2 · Assign apparatus ({selected.length})</Mono>
          {available.length === 0 ? <Text className="text-sm text-alert">No units available. Send what you can.</Text> : null}
          <View className="gap-1.5">
            {available.map((u) => {
              const on = selected.includes(u.id);
              return (
                <Pressable
                  key={u.id}
                  onPress={() => toggle(u.id)}
                  className={`min-h-[44px] flex-row items-center gap-3 rounded-lg border px-3 ${on ? "border-radio bg-radio/10" : "border-line bg-surface"}`}
                >
                  <Icon name={on ? "check" : "truck"} size={16} color={on ? "radio" : "muted"} />
                  <Text className="w-24 text-sm font-semibold text-ink">{u.name}</Text>
                  <Text className="flex-1 text-xs text-muted" numberOfLines={1}>
                    {UNIT_TYPE_LABEL[u.type]} · Sta {u.stationId} {stationById(u.stationId).name}
                  </Text>
                  <Mono className="text-xs text-dim">ETA {travelSeconds(u, incident.zone)}s</Mono>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          label="Dispatch"
          icon="radio"
          tone="primary"
          disabled={!classified || selected.length === 0}
          onPress={() => classified && onDispatch(classified, selected)}
        />
      </View>
    </Panel>
  );
}

function ActiveCall({ incident, units, onPlayRole, canPlayRole }: {
  incident: Incident;
  units: Unit[];
  onPlayRole: (unitId: string, crewId: string) => void;
  canPlayRole: boolean;
}) {
  const type = incidentTypeById(incident.typeId);
  const assigned = units.filter((u) => incident.units.includes(u.id));
  const ev = incident.dispatch;
  const playable = canPlayRole && incident.status === "active" && !incident.scene;
  return (
    <View className="gap-3">
      <Panel title={`${incident.number} · ${incident.status === "closed" ? "Closed" : "Working"}`} icon="flame">
        <View className="gap-3 p-3">
          <View>
            <Text className="text-lg font-bold text-ink">{type.label}</Text>
            <Text className="text-sm text-muted">{incident.address} · {incident.note}</Text>
          </View>
          {ev ? (
            <View className={`gap-1 rounded-lg border p-3 ${ev.classificationCorrect && !ev.missing.length ? "border-radio/50 bg-radio/10" : "border-amber/50 bg-amber/10"}`}>
              <Mono className="text-[10px] uppercase tracking-widest text-muted">CAD review · {ev.by === "ai" ? "AI Dispatcher" : "You"}</Mono>
              <Text className="text-sm text-ink">
                {ev.classificationCorrect ? "Classification correct." : `Classified as ${incidentTypeById(ev.classifiedAs).short}; actual ${type.short}.`}
              </Text>
              <Text className="text-sm text-ink">{ev.missing.length ? `Short on run card: ${ev.missing.join(", ")}` : "Run card met."}</Text>
              <Text className="text-xs text-muted">
                {ev.firstDueIncluded ? "First-due company assigned." : "First-due company not assigned."} Queue time {ev.delaySeconds}s.
              </Text>
            </View>
          ) : null}
        </View>
      </Panel>

      <Panel title="Personnel Responding" icon="users">
        <View className="gap-2 p-2">
          {assigned.length === 0 ? <Text className="p-2 text-sm text-dim">No units assigned.</Text> : null}
          {assigned.map((u) => (
            <View key={u.id} className="gap-2 rounded-lg border border-line bg-surface p-3">
              <View className="flex-row items-center gap-2">
                <StatusDot tone={STATUS_TONE[u.status]} />
                <Text className="flex-1 text-sm font-bold text-ink">{u.name}</Text>
                <Mono className="text-xs text-muted">{u.incidentId === incident.id ? STATUS_LABEL[u.status] : "REASSIGNED"}</Mono>
              </View>
              {u.crew.map((c) => (
                <View key={c.id} className="flex-row items-center gap-2 pl-4">
                  <Icon name={c.role === "chief" ? "star" : c.role === "officer" ? "shield" : "user"} size={14} color="muted" />
                  <Text className="flex-1 text-xs text-ink" numberOfLines={1}>{c.rank} {c.name}</Text>
                  {playable && u.incidentId === incident.id ? (
                    <Button small label="Play Role" icon="play" tone="amber" onPress={() => onPlayRole(u.id, c.id)} />
                  ) : null}
                </View>
              ))}
            </View>
          ))}
          {incident.scene ? (
            <Text className="p-2 text-xs text-amber">You are operating on this incident.</Text>
          ) : null}
        </View>
      </Panel>
    </View>
  );
}

// ───────────── Units board ─────────────
export function UnitsBoard({ units }: { units: Unit[] }) {
  const avail = units.filter((u) => u.status === "available").length;
  return (
    <Panel title={`Apparatus · ${avail}/${units.length} available`} icon="truck">
      <View className="flex-row flex-wrap gap-1.5 p-2">
        {units.map((u) => (
          <View key={u.id} className="min-w-[132px] flex-1 flex-row items-center gap-2 rounded-md border border-line bg-surface px-2 py-1.5">
            <StatusDot tone={STATUS_TONE[u.status]} />
            <Text className="flex-1 text-xs font-semibold text-ink" numberOfLines={1}>{u.name}</Text>
            <Mono className="text-[10px] text-muted">{STATUS_LABEL[u.status]}</Mono>
          </View>
        ))}
      </View>
    </Panel>
  );
}

// ───────────── Schematic map ─────────────
export function TownMap({ units, incidents }: { units: Unit[]; incidents: Incident[] }) {
  const open = incidents.filter((i) => i.status !== "closed");
  return (
    <Panel title="Middletown Twp · Schematic" icon="map">
      <View className="m-2 aspect-[4/3] overflow-hidden rounded-lg border border-line bg-surface">
        <View className="absolute left-0 right-0 top-0 h-[7%] bg-info/15" />
        <Mono className="absolute left-2 top-0.5 text-[9px] text-info">RARITAN / SANDY HOOK BAY</Mono>
        <View className="absolute bottom-[45%] left-0 right-0 h-[2px] bg-line" />
        <Mono className="absolute bottom-[46%] left-2 text-[9px] text-dim">RT 35</Mono>
        <View className="absolute bottom-[80%] left-0 right-0 h-[2px] bg-line" />
        <Mono className="absolute bottom-[81%] right-2 text-[9px] text-dim">RT 36</Mono>
        {STATIONS.map((s) => {
          const here = units.filter((u) => u.stationId === s.id);
          const free = here.filter((u) => u.status === "available").length;
          return (
            <View key={s.id} className="absolute items-center" style={{ left: `${s.x}%`, top: `${s.y}%`, transform: [{ translateX: -10 }, { translateY: -10 }] }}>
              <View className={`h-5 w-5 items-center justify-center rounded ${free ? "bg-radio/80" : "bg-dim"}`}>
                <Mono className="text-[9px] font-bold text-bg">{s.id}</Mono>
              </View>
            </View>
          );
        })}
        {open.map((i) => (
          <View
            key={i.id}
            className="absolute"
            style={{ left: `${stationById(i.zone).x + 4}%`, top: `${stationById(i.zone).y + 4}%` }}
          >
            <Icon name={i.status === "pending" ? "siren" : "flame"} size={16} color={i.status === "pending" ? "alert" : "fire"} />
          </View>
        ))}
      </View>
    </Panel>
  );
}

// ───────────── Log ─────────────
const LOG_TONE = { call: "text-alert", dispatch: "text-amber", radio: "text-radio", ai: "text-info", alert: "text-alert", system: "text-muted" } as const;

export function LogFeed({ log, limit = 40 }: { log: LogEntry[]; limit?: number }) {
  return (
    <Panel title="Radio / CAD Log" icon="radio">
      <ScrollView className="max-h-[360px]" nestedScrollEnabled>
        <View className="gap-1 p-2">
          {log.slice(0, limit).map((e) => (
            <View key={e.id} className="flex-row gap-2">
              <Mono className="text-[11px] text-dim">{formatClock(e.at)}</Mono>
              <Mono className={`flex-1 text-[11px] leading-4 ${LOG_TONE[e.kind]}`}>{e.text}</Mono>
            </View>
          ))}
        </View>
      </ScrollView>
    </Panel>
  );
}
