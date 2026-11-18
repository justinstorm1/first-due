import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { STATIONS, createFleet, UNIT_TYPE_LABEL } from "@/data/town";
import type { FieldRole, Seat } from "@/game/types";
import { RADIUS, Surface } from "./glass";
import { Icon } from "./icon";
import { Button, Chip, Mono } from "./ui";

const ROLE_TITLE: Record<FieldRole, string> = { ff: "Firefighter", officer: "Company Officer", chief: "Chief Officer" };

/** Pick station → apparatus → the exact crew member to stand by as. */
export function SeatPicker({ role, visible, onClose, onConfirm }: {
  role: FieldRole;
  visible: boolean;
  onClose: () => void;
  onConfirm: (seat: Seat) => void;
}) {
  const fleet = useMemo(() => createFleet(), []);
  const eligible = fleet.filter((u) => u.crew.some((c) => c.role === role));
  const stations = STATIONS.filter((s) => eligible.some((u) => u.stationId === s.id));
  const [stationId, setStationId] = useState<number | null>(null);
  const [seat, setSeat] = useState<Seat | null>(null);
  const station = stationId ?? stations[0]?.id;
  const units = eligible.filter((u) => u.stationId === station);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Surface radius={RADIUS.sheet} topOnly className="max-h-[90%] w-full max-w-[720px] self-center border border-line bg-surface">
          <SafeAreaView edges={["bottom", "left", "right"]} className="shrink">
          <View className="shrink pb-4">
            <View className="flex-row items-center gap-3 px-5 pb-2 pt-5">
              <View className="flex-1">
                <Text className="text-xl font-bold text-ink">Stand by as {ROLE_TITLE[role]}</Text>
                <Text className="text-sm text-muted">Pick your station, apparatus, and who you are.</Text>
              </View>
              <Pressable accessibilityLabel="Close" onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-raised">
                <Icon name="x" size={18} />
              </Pressable>
            </View>

            <Mono className="px-5 pt-2 text-[11px] uppercase tracking-widest text-dim">Station</Mono>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 py-2">
              {stations.map((s) => (
                <Chip key={s.id} label={`${s.id} · ${s.name}`} tone="amber" selected={station === s.id} onPress={() => setStationId(s.id)} />
              ))}
            </ScrollView>

            <ScrollView className="max-h-[420px]" contentContainerClassName="gap-3 px-5 py-2">
              {units.map((u) => (
                <View key={u.id} className="gap-1 rounded-2xl border border-line bg-panel p-3">
                  <View className="flex-row items-center gap-2 pb-1">
                    <Icon name={u.type === "chief" ? "star" : "truck"} size={16} color="amber" />
                    <Text className="flex-1 text-base font-bold text-ink">{u.name}</Text>
                    <Mono className="text-[10px] uppercase text-dim">{UNIT_TYPE_LABEL[u.type]}</Mono>
                  </View>
                  {u.crew
                    .filter((c) => c.role === role)
                    .map((c) => {
                      const on = seat?.crewId === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          testID={`seat-${c.id}`}
                          onPress={() => setSeat({ unitId: u.id, crewId: c.id })}
                          className={`min-h-[48px] flex-row items-center gap-3 rounded-xl border px-3 ${on ? "border-amber bg-amber/15" : "border-transparent bg-raised"}`}
                        >
                          <Icon name={on ? "check" : "user"} size={16} color={on ? "amber" : "muted"} />
                          <Text className="flex-1 text-sm text-ink">{c.rank} {c.name}</Text>
                        </Pressable>
                      );
                    })}
                </View>
              ))}
            </ScrollView>

            <View className="px-5 pt-3">
              <Button
                testID="seat-confirm"
                label={seat ? "Go in service" : "Select a member"}
                icon="radio"
                tone="amber"
                disabled={!seat}
                onPress={() => seat && onConfirm(seat)}
              />
            </View>
          </View>
          </SafeAreaView>
        </Surface>
      </View>
    </Modal>
  );
}
