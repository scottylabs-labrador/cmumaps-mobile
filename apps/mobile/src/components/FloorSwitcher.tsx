import { useEffect, useMemo, useRef } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  floors: string[];
  current?: string;
  onSelect: (floor: string) => void;
}

const WHEEL_SIZE = 208;
const ACTIVE_SIZE = 46;
const CENTER_LEFT = 156;
const CENTER_TOP = 81;
const STEP_PX = 58;
const ARC_RADIUS = 76;
const ANGLE_STEP = (50 * Math.PI) / 180;

const DELTAS = [2, 1.5, 1, 0.5, 0, -0.5, -1, -1.5, -2];
const ARC_X = DELTAS.map((delta) => ARC_RADIUS * (Math.cos(delta * ANGLE_STEP) - 1));
const ARC_Y = DELTAS.map((delta) => ARC_RADIUS * Math.sin(delta * ANGLE_STEP));
const SCALES = [0.65, 0.74, 0.83, 0.94, 1, 0.94, 0.83, 0.74, 0.65];
const OPACITIES = [0, 0.25, 1, 1, 1, 1, 1, 0.25, 0];

export const FloorSwitcher = ({ floors, current, onSelect }: Props) => {
  const index = Math.max(0, floors.indexOf(current ?? ""));
  const progress = useRef(new Animated.Value(index)).current;
  const progressValue = useRef(index);
  const dragStart = useRef(index);
  const dragging = useRef(false);
  const floorsRef = useRef(floors);
  const currentRef = useRef(current);
  const onSelectRef = useRef(onSelect);
  floorsRef.current = floors;
  currentRef.current = current;
  onSelectRef.current = onSelect;

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      progressValue.current = value;
    });
    return () => progress.removeListener(id);
  }, [progress]);

  useEffect(() => {
    if (dragging.current) {
      return;
    }
    if (Math.abs(progressValue.current - index) < 0.01) {
      return;
    }
    Animated.timing(progress, {
      toValue: index,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [index, progress]);

  const settleToNearest = useRef(() => {
    const max = Math.max(0, floorsRef.current.length - 1);
    const value = progressValue.current;
    const target = Math.max(0, Math.min(max, Math.round(value)));
    Animated.timing(progress, {
      toValue: target,
      duration: Math.max(80, Math.abs(value - target) * 180),
      useNativeDriver: false,
    }).start(({ finished }) => {
      dragging.current = false;
      if (!finished) {
        return;
      }
      progressValue.current = target;
      const floor = floorsRef.current[target];
      if (floor && floor !== currentRef.current) {
        onSelectRef.current(floor);
      }
    });
  }).current;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
        onPanResponderGrant: () => {
          dragging.current = true;
          progress.stopAnimation((value) => {
            progressValue.current = value;
            dragStart.current = value;
          });
          dragStart.current = progressValue.current;
        },
        onPanResponderMove: (_, gesture) => {
          const max = Math.max(0, floorsRef.current.length - 1);
          const next = Math.max(0, Math.min(max, dragStart.current - gesture.dy / STEP_PX));
          progress.setValue(next);
        },
        onPanResponderRelease: settleToNearest,
        onPanResponderTerminate: settleToNearest,
      }),
    [progress, settleToNearest],
  );

  if (floors.length === 0) {
    return null;
  }

  return (
    <View style={styles.shadowWrap} {...pan.panHandlers}>
      <View style={styles.wheel}>
        {floors.map((floor, floorIndex) => {
          const inputRange = DELTAS.map((delta) => floorIndex - delta);
          const translateX = progress.interpolate({
            inputRange,
            outputRange: ARC_X,
            extrapolate: "clamp",
          });
          const translateY = progress.interpolate({
            inputRange,
            outputRange: ARC_Y,
            extrapolate: "clamp",
          });
          const scale = progress.interpolate({
            inputRange,
            outputRange: SCALES,
            extrapolate: "clamp",
          });
          const opacity = progress.interpolate({
            inputRange,
            outputRange: OPACITIES,
            extrapolate: "clamp",
          });
          const selected = floor === current;
          const visible = Math.abs(floorIndex - index) <= 2;

          return (
            <Animated.View
              key={floor}
              style={[
                styles.item,
                {
                  opacity,
                  transform: [{ translateX }, { translateY }, { scale }],
                },
              ]}
              pointerEvents={visible ? "box-none" : "none"}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Floor ${floor}`}
                accessibilityState={{ selected }}
                onPress={() => onSelect(floor)}
                style={[styles.floor, selected ? styles.floorOn : null]}
              >
                <Text
                  style={[styles.text, selected ? styles.textOn : null]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {floor}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: WHEEL_SIZE / 2,
    height: WHEEL_SIZE,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    width: WHEEL_SIZE,
    elevation: 6,
  },
  wheel: {
    backgroundColor: "#ffffff",
    borderRadius: WHEEL_SIZE / 2,
    height: WHEEL_SIZE,
    overflow: "hidden",
    width: WHEEL_SIZE,
  },
  item: {
    height: ACTIVE_SIZE,
    left: CENTER_LEFT,
    position: "absolute",
    top: CENTER_TOP,
    width: ACTIVE_SIZE,
  },
  floor: {
    alignItems: "center",
    backgroundColor: "#8ACBE8",
    borderRadius: ACTIVE_SIZE / 2,
    height: ACTIVE_SIZE,
    justifyContent: "center",
    paddingHorizontal: 4,
    width: ACTIVE_SIZE,
  },
  floorOn: {
    backgroundColor: "#0E96D1",
  },
  text: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  textOn: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "600",
  },
});
