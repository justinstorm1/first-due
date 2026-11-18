import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Safe-area strategy: fixed chrome (top bar, tab bar) is wrapped in a SafeAreaView so its
 * background extends under the status bar / home indicator while its content is padded clear.
 * Scrolling content is never wrapped — it runs edge to edge and gets the inset as content
 * padding, so it scrolls under the system bars instead of being clipped at them.
 */

export function TopBar({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} className="border-b border-line bg-surface">
      <View className="min-h-[56px] flex-row items-center gap-3 px-4 py-2">{children}</View>
    </SafeAreaView>
  );
}

export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="border-t border-line bg-surface">
      <View className="flex-row">{children}</View>
    </SafeAreaView>
  );
}

/** Bottom padding for a ScrollView that reaches the bottom screen edge. */
export function useScrollPadding(extra = 32) {
  const insets = useSafeAreaInsets();
  return { paddingBottom: insets.bottom + extra };
}
