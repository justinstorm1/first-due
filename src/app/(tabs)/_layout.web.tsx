import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from "expo-router/ui";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Flame, FlameCore, TileBackground } from "@/components/flame-mark";
import { Icon } from "@/components/icon";
import { TopInsetConsumed } from "@/components/safe-area";
import { Mono } from "@/components/ui";
import { rankFor } from "@/game/engine";
import type { IconName } from "@/game/types";
import { useGame } from "@/store/game-store";

/**
 * Web uses a custom shadcn-style navbar (headless expo-router/ui tabs) instead of native tabs:
 * a sticky, blurred top bar on desktop and a bottom bar on narrow (mobile web) viewports.
 *
 * Safe areas: each bar is a SafeAreaView (full-bleed background under notch / home indicator /
 * side camera rail). Bar padding is passed via `style` (not a Tailwind class): the web
 * SafeAreaView writes inline padding = style padding + inset, which would override a class.
 * TabTriggers must stay DIRECT children of the TabList's child or they aren't registered.
 */
export default function WebTabsLayout() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const pending = useGame((s) => (s.role === "dispatcher" ? s.incidents.filter((i) => i.status === "pending").length : 0));
  const profile = useGame((s) => s.profile);

  const links = (
    <>
      <TabTrigger name="index" href="/" asChild>
        <NavLink label="Home" icon="home" compact={compact} />
      </TabTrigger>
      <TabTrigger name="dispatch" href="/dispatch" asChild>
        <NavLink label="CAD" icon="headset" badge={pending} compact={compact} />
      </TabTrigger>
      <TabTrigger name="drill" href="/drill" asChild>
        <NavLink label="Practice" icon="clipboard" compact={compact} />
      </TabTrigger>
      <TabTrigger name="profile" href="/profile" asChild>
        <NavLink label="Profile" icon="user" compact={compact} />
      </TabTrigger>
    </>
  );

  const topBar = (
    <TabList asChild>
      <SafeAreaView
        edges={["top", "left", "right"]}
        className="z-10 min-h-14 flex-row items-center gap-1 border-b border-line bg-surface/80 backdrop-blur-md"
        style={{ paddingHorizontal: 24 }}
      >
          <View className="mr-5 flex-row items-center gap-2.5">
            <View className="h-7 w-7">
              <View className="absolute inset-0"><TileBackground size={28} /></View>
              <View className="absolute inset-0"><Flame size={28} /></View>
              <View className="absolute inset-0"><FlameCore size={28} /></View>
            </View>
            <Text className="text-sm font-bold tracking-tight text-ink">First Due</Text>
            <Mono className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted">TRAINING</Mono>
          </View>
          {links}
          <View className="flex-1" />
          <View className="flex-row items-center gap-2 rounded-md border border-line px-3 py-1.5">
            <Icon name="shield" size={14} color="amber" />
            <Text className="text-xs font-medium text-ink">{profile.name}</Text>
            <Text className="text-xs text-muted">· {rankFor(profile)}</Text>
          </View>
      </SafeAreaView>
    </TabList>
  );

  const bottomBar = (
    <TabList asChild>
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        className="flex-row gap-1 border-t border-line bg-surface/90 backdrop-blur-md"
        style={{ paddingHorizontal: 12, paddingVertical: 6 }}
      >
        {links}
      </SafeAreaView>
    </TabList>
  );

  return (
    <Tabs style={{ flex: 1, flexDirection: "column" }}>
      {compact ? null : topBar}
      {/* Desktop: the navbar above already applied the top inset, so screen top bars skip it. */}
      <TopInsetConsumed.Provider value={!compact}>
        {/* Fixed-height slot so the bar never gets pushed off-screen by tall content. */}
        <View style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <TabSlot />
        </View>
      </TopInsetConsumed.Provider>
      {compact ? bottomBar : null}
    </Tabs>
  );
}

type NavLinkProps = TabTriggerSlotProps & { label: string; icon: IconName; badge?: number; compact: boolean };

// React 19: the slot ref is a plain prop; it is not needed for these links.
function NavLink({ label, icon, badge, compact, isFocused, ref: _ref, ...props }: NavLinkProps) {
  if (compact) {
    return (
      <Pressable {...props} className="flex-1 rounded-md py-1.5 transition-colors hover:bg-raised">
        {/* Inner column so the trigger's injected styles can't change the stacking. */}
        <View className="items-center gap-0.5" style={{ flexDirection: "column" }}>
          <View>
            <Icon name={icon} size={18} color={isFocused ? "amber" : "muted"} />
            {badge ? <View className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-alert" /> : null}
          </View>
          <Text className={`text-[11px] ${isFocused ? "font-semibold text-amber" : "text-muted"}`}>{label}</Text>
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable
      {...props}
      className={`h-9 flex-row items-center gap-2 rounded-md px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber ${isFocused ? "bg-raised" : "hover:bg-raised/60"}`}
    >
      <Icon name={icon} size={15} color={isFocused ? "amber" : "muted"} />
      <Text className={`text-sm ${isFocused ? "font-medium text-ink" : "text-muted"}`}>{label}</Text>
      {badge ? (
        <View className="min-w-[18px] items-center rounded-full bg-alert px-1.5">
          <Text className="text-[10px] font-bold text-white">{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
