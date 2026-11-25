import { useEffect } from "react";
import * as Location from "expo-location";
import { useMapStore } from "@/store";

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
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 8,
        },
        (position) => {
          setUserPosition({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
      );
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
  const position = await Location.getCurrentPositionAsync({});
  useMapStore.getState().setUserPosition({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });
  useMapStore.getState().setLocationPromptVisible(false);
  return true;
};
