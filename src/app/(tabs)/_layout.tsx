import { NativeTabs } from "expo-router/native-tabs";

import { useGame } from "@/store/game-store";
import { colors } from "@/theme/colors";

/**
 * Native tab bar: Liquid Glass on iOS 26, Material 3 bottom navigation on Android,
 * expo-router's built-in tab bar on web. Insets for the bar are applied by the
 * navigator (automatic ScrollView insets on iOS, a bottom SafeAreaView on Android).
 */
export default function TabsLayout() {
  const pending = useGame((s) => s.incidents.filter((i) => i.status === "pending").length);
  const dispatcher = useGame((s) => s.role === "dispatcher");

  return (
    <NativeTabs
      tintColor={colors.amber}
      iconColor={colors.muted}
      backgroundColor={colors.surface}
      indicatorColor={colors.raised}
      rippleColor="rgba(255,255,255,0.12)"
      badgeBackgroundColor={colors.alert}
      labelStyle={{ color: colors.muted }}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dispatch">
        <NativeTabs.Trigger.Icon sf={{ default: "headphones", selected: "headphones" }} md="headset_mic" />
        <NativeTabs.Trigger.Label>CAD</NativeTabs.Trigger.Label>
        {dispatcher && pending > 0 ? <NativeTabs.Trigger.Badge>{String(pending)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="drill">
        <NativeTabs.Trigger.Icon sf={{ default: "checklist", selected: "checklist" }} md="quiz" />
        <NativeTabs.Trigger.Label>Practice</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="person" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
