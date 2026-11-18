import { createContext, useContext, type ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView, useSafeAreaInsets, type Edge } from "react-native-safe-area-context";

import { LIQUID_GLASS, Surface } from "./glass";

/**
 * Safe-area strategy (all via SafeAreaView from react-native-safe-area-context):
 *  - Fixed chrome (top bar, web navbar, web tab bar) wraps its content in a SafeAreaView so its
 *    background is full-bleed under the status bar / home indicator / side camera rail
 *    (e.g. iPhone Duo) while its controls are padded clear.
 *  - Screen content sits in a left/right SafeAreaView (SafeBody) so nothing is under a side rail.
 *  - Scrolling content runs to the bottom edge and gets the bottom inset as content padding.
 *
 * On web, SafeAreaView adds the env() inset to every wrapper (it is not overlap-aware), so an
 * edge must be consumed exactly once. TopInsetConsumed tells screen top bars when a parent
 * navbar already consumed the top edge.
 */
export const TopInsetConsumed = createContext(false);

export function TopBar({ children }: { children: ReactNode }) {
  const topConsumed = useContext(TopInsetConsumed);
  const edges: Edge[] = topConsumed ? ["left", "right"] : ["top", "left", "right"];
  return (
    <Surface className={LIQUID_GLASS ? "" : "border-b border-line bg-surface android:border-b-0 web:bg-surface/80 web:backdrop-blur-md"}>
      <SafeAreaView edges={edges}>
        <View className="min-h-[56px] flex-row items-center gap-3 px-4 py-2">{children}</View>
      </SafeAreaView>
    </Surface>
  );
}

/** Content region below the top bar: keeps content clear of side insets (camera rail, landscape notch). */
export function SafeBody({ children, className = "flex-1" }: { children: ReactNode; className?: string }) {
  return (
    <SafeAreaView edges={["left", "right"]} className={className} collapsable={false}>
      {children}
    </SafeAreaView>
  );
}

/**
 * Inside a native-tabs screen the navigator owns the bottom inset (automatic ScrollView
 * insets on iOS, a bottom SafeAreaView on Android; the web tab bar pads itself), so only
 * breathing room is added.
 */
export const TAB_SCROLL_PADDING = { paddingBottom: 24 };

/** Bottom padding for a ScrollView that reaches the bottom screen edge (stack screens). */
export function useScrollPadding(extra = 32) {
  const insets = useSafeAreaInsets();
  return { paddingBottom: insets.bottom + extra };
}
