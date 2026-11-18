import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/glass";
import { Icon } from "@/components/icon";
import { SafeBody, TopBar, useScrollPadding } from "@/components/safe-area";
import { Button, haptic, Mono, Panel } from "@/components/ui";
import { CERTS, errorRate, hasCert, rankFor } from "@/game/engine";
import { useGame } from "@/store/game-store";
import { colors } from "@/theme/colors";

/** Switch, create, and delete profiles. Each profile keeps its own complete record. */
export default function ProfilesScreen() {
  const scrollPad = useScrollPadding();
  const active = useGame((s) => s.profile);
  const othersMap = useGame((s) => s.others);
  const switchProfile = useGame((s) => s.switchProfile);
  const createProfile = useGame((s) => s.createProfile);
  const deleteProfile = useGame((s) => s.deleteProfile);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const others = Object.values(othersMap).sort((a, b) => a.name.localeCompare(b.name));

  const done = () => router.navigate("/");

  return (
    <Screen>
      <TopBar>
        <Pressable accessibilityLabel="Back" onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full bg-panel">
          <Icon name="arrow-left" size={18} />
        </Pressable>
        <Text className="flex-1 text-base font-bold text-ink">Switch profile</Text>
      </TopBar>
      <SafeBody>
      <ScrollView contentContainerClassName="gap-4 p-4 w-full max-w-[720px] self-center" contentContainerStyle={scrollPad}>
        <Text className="text-sm text-muted">Switching ends any tour in progress. Each profile keeps its own certificates, history, and activity.</Text>

        {[active, ...others].map((p) => {
          const isActive = p.id === active.id;
          const certs = CERTS.filter((c) => hasCert(p, c.id)).length;
          const answered = Object.values(p.tracks).reduce((s, t) => s + t.answered, 0);
          return (
            <Panel key={p.id} className={isActive ? "border border-amber" : ""}>
              <View className="gap-3 p-4">
                <View className="flex-row items-center gap-3">
                  <View className={`h-11 w-11 items-center justify-center rounded-full ${isActive ? "bg-amber/20" : "bg-raised"}`}>
                    <Icon name="user" size={20} color={isActive ? "amber" : "muted"} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-ink">{p.name}</Text>
                    <Text className="text-xs text-muted">{rankFor(p)}</Text>
                  </View>
                  {isActive ? <Mono className="text-[10px] uppercase tracking-widest text-amber">Active</Mono> : null}
                </View>
                <Mono className="text-[11px] text-muted">
                  {certs} certs · {answered.toLocaleString("en-US")} questions · {Math.round(errorRate(p) * 100)}% err · {p.history.length} incidents
                </Mono>
                {!isActive ? (
                  <View className="flex-row gap-2">
                    <Button
                      className="flex-1"
                      small
                      label="Switch to"
                      icon="play"
                      tone="amber"
                      onPress={() => {
                        haptic("success");
                        switchProfile(p.id);
                        done();
                      }}
                    />
                    <Button
                      small
                      label={confirmDelete === p.id ? "Tap again to delete" : "Delete"}
                      icon="x"
                      tone={confirmDelete === p.id ? "primary" : "ghost"}
                      onPress={() => {
                        if (confirmDelete !== p.id) return setConfirmDelete(p.id);
                        deleteProfile(p.id);
                        setConfirmDelete(null);
                      }}
                    />
                  </View>
                ) : null}
              </View>
            </Panel>
          );
        })}

        <Panel title="New profile" icon="user">
          <View className="gap-3 p-4">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name (e.g. FF Rivera)"
              placeholderTextColor={colors.dim}
              className="min-h-[46px] rounded-xl border border-line bg-surface px-3 text-base text-ink"
            />
            <Button
              testID="create-profile"
              label="Create & switch"
              icon="check"
              tone="amber"
              disabled={!name.trim()}
              onPress={() => {
                createProfile(name);
                setName("");
                done();
              }}
            />
          </View>
        </Panel>
      </ScrollView>
      </SafeBody>
    </Screen>
  );
}
