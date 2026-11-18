import "../global.css";

import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AnimatedSplash } from "@/components/animated-splash";
import { GameClock } from "@/components/game-clock";
import { NoticeToast } from "@/components/notice-toast";
import { ToneOut } from "@/components/tone-out";
import { colors } from "@/theme/colors";

// Dark navigation theme prevents white flashes behind native tabs / Liquid Glass.
const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.amber,
    background: colors.bg,
    card: colors.surface,
    text: colors.ink,
    border: colors.line,
    notification: colors.alert,
  },
};

// Keep the native splash up until the animated splash has drawn its first frame.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);
  return (
    <SafeAreaProvider>
      <ThemeProvider value={NAV_THEME}>
      <View className="flex-1 bg-bg">
        <StatusBar style="light" />
        <GameClock />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: "fade_from_bottom",
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="scene/[incidentId]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="debrief/[incidentId]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="standby" options={{ animation: "fade" }} />
          <Stack.Screen name="profiles" options={{ presentation: "modal" }} />
        </Stack>
        {splashDone ? <ToneOut /> : null}
        <NoticeToast />
        {!splashDone ? <AnimatedSplash onDone={() => setSplashDone(true)} /> : null}
      </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
