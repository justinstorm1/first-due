import "../global.css";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AnimatedSplash } from "@/components/animated-splash";
import { GameClock } from "@/components/game-clock";
import { NoticeToast } from "@/components/notice-toast";
import { colors } from "@/theme/colors";

// Keep the native splash up until the animated splash has drawn its first frame.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);
  return (
    <SafeAreaProvider>
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
          <Stack.Screen name="index" />
          <Stack.Screen name="dispatch" options={{ animation: "fade" }} />
          <Stack.Screen name="scene/[incidentId]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="debrief/[incidentId]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="profile" options={{ presentation: "modal" }} />
        </Stack>
        <NoticeToast />
        {!splashDone ? <AnimatedSplash onDone={() => setSplashDone(true)} /> : null}
      </View>
    </SafeAreaProvider>
  );
}
