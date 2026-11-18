import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { useGame } from "@/store/game-store";

/** Drives the town simulation at 1 tick/second while a session is active and the app is foregrounded. */
export function GameClock() {
  const active = useGame((s) => s.role !== null);
  const [foreground, setForeground] = useState(AppState.currentState !== "background");

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setForeground(state === "active"));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!active || !foreground) return;
    const id = setInterval(() => useGame.getState().tick(), 1000);
    return () => clearInterval(id);
  }, [active, foreground]);

  return null;
}
