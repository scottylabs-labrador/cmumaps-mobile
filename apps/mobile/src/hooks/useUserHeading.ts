import { useEffect, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import { reliableHeading } from "@/lib/userHeading";

export const useUserHeading = (enabled: boolean) => {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let subscription: Location.LocationSubscription | null = null;
    let generation = 0;

    const stop = () => {
      generation += 1;
      subscription?.remove();
      subscription = null;
      setHeading(null);
    };
    const start = async () => {
      stop();
      const current = generation;
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (current !== generation || !permission.granted) return;
        const next = await Location.watchHeadingAsync((value) => {
          if (current === generation) setHeading(reliableHeading(value));
        });
        if (current !== generation) next.remove();
        else subscription = next;
      } catch {
        // Missing compass hardware must not affect location or navigation.
        if (current === generation) setHeading(null);
      }
    };

    if (AppState.currentState === "active") void start();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void start();
      else stop();
    });
    return () => {
      listener.remove();
      stop();
    };
  }, [enabled]);

  return enabled ? heading : null;
};
