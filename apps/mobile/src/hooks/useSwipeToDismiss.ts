import { useLayoutEffect, useMemo, useRef } from "react";
import { Animated, PanResponder, useWindowDimensions } from "react-native";

interface Options {
  /** Vertical drag distance (px) that dismisses. */
  threshold?: number;
  /** Downward velocity that dismisses. */
  velocity?: number;
  /** How far the sheet animates off-screen on dismiss. */
  dismissDistance?: number;
  /** Reset the translation before a previously hidden sheet is shown again. */
  visible?: boolean;
  onSwipeUp?: () => void;
}

/**
 * Pan handlers + translateY for swipe-down-to-dismiss sheets.
 * Attach `panHandlers` to the grabber/header so nested ScrollViews keep scrolling.
 */
export const useSwipeToDismiss = (onDismiss: () => void, options: Options = {}) => {
  const threshold = options.threshold ?? 100;
  const velocity = options.velocity ?? 1.1;
  const dismissDistance = options.dismissDistance ?? 420;
  const { height: windowHeight } = useWindowDimensions();
  const onSwipeUp = options.onSwipeUp;
  const dragY = useRef(new Animated.Value(0)).current;
  const visible = options.visible ?? true;

  useLayoutEffect(() => {
    if (visible) {
      dragY.stopAnimation();
      dragY.setValue(0);
    }
  }, [dragY, visible]);

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
              toValue: Math.max(dismissDistance, windowHeight, gesture.dy + 1),
              duration: 180,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) onDismiss();
            });
            return;
          }
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          if (gesture.dy < -48) onSwipeUp?.();
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        },
      }),
    [dismissDistance, dragY, onDismiss, onSwipeUp, threshold, velocity, windowHeight],
  );

  return { dragY, panHandlers: pan.panHandlers };
};
