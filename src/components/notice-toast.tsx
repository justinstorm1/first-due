import { useEffect } from "react";
import { Pressable, Text } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGame } from "@/store/game-store";
import { Icon } from "./icon";
import { haptic } from "./ui";

/** Shows certificate / write-up events one at a time at the top of the screen. */
export function NoticeToast() {
  const notice = useGame((s) => s.notices[0]);
  const dismiss = useGame((s) => s.dismissNotice);

  useEffect(() => {
    if (!notice) return;
    haptic(notice.kind === "earned" ? "success" : "warning");
    const t = setTimeout(() => dismiss(notice.id), 4200);
    return () => clearTimeout(t);
  }, [notice, dismiss]);

  if (!notice) return null;
  const earned = notice.kind === "earned";
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      pointerEvents="box-none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, alignItems: "center", paddingHorizontal: 16, paddingTop: 8 }}
    >
      <Animated.View key={notice.id} entering={FadeInUp} exiting={FadeOutUp} style={{ width: "100%", maxWidth: 520 }}>
        <Pressable
          onPress={() => dismiss(notice.id)}
          className={`flex-row items-center gap-3 rounded-xl border px-4 py-3 ${earned ? "border-amber bg-surface" : "border-alert bg-surface"}`}
        >
          <Icon name={earned ? "award" : "alert"} size={22} color={earned ? "amber" : "alert"} />
          <Text className="flex-1 text-sm font-semibold text-ink">{notice.text}</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
