import { useMemo, useRef } from "react";
import { Animated, PanResponder } from "react-native";

interface Options {
  /** Vertical drag distance (px) that dismisses. */
  threshold?: number;
  /** Downward velocity that dismisses. */
  velocity?: number;
  /** How far the sheet animates off-screen on dismiss. */
  dismissDistance?: number;
}

/**
 * Pan handlers + translateY for swipe-down-to-dismiss sheets.
 * Attach `panHandlers` to the grabber/header so nested ScrollViews keep scrolling.
 */
export const useSwipeToDismiss = (onDismiss: () => void, options: Options = {}) => {
  const threshold = options.threshold ?? 100;
  const velocity = options.velocity ?? 1.1;
  const dismissDistance = options.dismissDistance ?? 420;
  const dragY = useRef(new Animated.Value(0)).current;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            dragY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > threshold || gesture.vy > velocity) {
            Animated.timing(dragY, {
              toValue: dismissDistance,
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              dragY.setValue(0);
              onDismiss();
            });
            return;
          }
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        },
      }),
    [dismissDistance, dragY, onDismiss, threshold, velocity],
  );

  return { dragY, panHandlers: pan.panHandlers };
};
