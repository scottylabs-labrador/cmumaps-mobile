import { Accelerometer } from "expo-sensors";
import { useEffect, useRef } from "react";

/** Delta of consecutive samples; keep high so walking/panning the phone does not fire. */
const SHAKE_THRESHOLD = 4.2;
const SAMPLE_MS = 100;
const COOLDOWN_MS = 5000;
/** Require a second spike soon after the first so one bump is not enough. */
const CONFIRM_WINDOW_MS = 450;

/**
 * Calls `onShake` when the device is shaken. Ignores rapid repeats via cooldown.
 * No-op when the Accelerometer is unavailable (e.g. some web targets).
 */
export const useShakeGesture = (onShake: () => void, enabled = true) => {
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;
  const lastShakeAt = useRef(0);
  const pendingSpikeAt = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    const start = async () => {
      const available = await Accelerometer.isAvailableAsync();
      if (!available || cancelled) {
        return;
      }
      Accelerometer.setUpdateInterval(SAMPLE_MS);
      let lastX = 0;
      let lastY = 0;
      let lastZ = 0;
      let primed = false;
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        if (!primed) {
          lastX = x;
          lastY = y;
          lastZ = z;
          primed = true;
          return;
        }
        const delta = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);
        lastX = x;
        lastY = y;
        lastZ = z;
        if (delta < SHAKE_THRESHOLD) {
          return;
        }
        const now = Date.now();
        if (now - lastShakeAt.current < COOLDOWN_MS) {
          return;
        }
        if (now - pendingSpikeAt.current > CONFIRM_WINDOW_MS) {
          pendingSpikeAt.current = now;
          return;
        }
        pendingSpikeAt.current = 0;
        lastShakeAt.current = now;
        onShakeRef.current();
      });
    };

    start().catch(() => undefined);
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);
};
