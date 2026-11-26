import { useEffect } from "react";
import * as Location from "expo-location";
import { useMapStore } from "@/store";

const watchOptions: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  distanceInterval: 8,
};

const startWatch = async (
  setUserPosition: (position: { latitude: number; longitude: number } | null) => void,
) => {
  const position = await Location.getCurrentPositionAsync({});
  setUserPosition({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });
  return Location.watchPositionAsync(watchOptions, (next) => {
    setUserPosition({
      latitude: next.coords.latitude,
      longitude: next.coords.longitude,
    });
  });
};

export const useUserLocation = () => {
  const setUserPosition = useMapStore((state) => state.setUserPosition);
  const setLocationPromptVisible = useMapStore((state) => state.setLocationPromptVisible);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let active = true;

    const watch = async () => {
      const current = await Location.getForegroundPermissionsAsync();
      if (!active) {
        return;
      }
      if (current.status !== Location.PermissionStatus.GRANTED) {
        setLocationPromptVisible(true);
        return;
      }
      setLocationPromptVisible(false);
      subscription = await startWatch(setUserPosition);
    };

    watch().catch(() => {
      setLocationPromptVisible(true);
    });

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [setLocationPromptVisible, setUserPosition]);
};

export const requestUserLocation = async () => {
  const result = await Location.requestForegroundPermissionsAsync();
  if (result.status !== Location.PermissionStatus.GRANTED) {
    return false;
  }
  const setUserPosition = useMapStore.getState().setUserPosition;
  await startWatch(setUserPosition);
  useMapStore.getState().setLocationPromptVisible(false);
  return true;
};
