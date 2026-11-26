import { useEffect, useMemo, useRef } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
interface Props {
  floors: string[];
  current?: string;
  onSelect: (floor: string) => void;
}

const ITEM = 50;
const ARC_X = 28;

export const FloorSwitcher = ({ floors, current, onSelect }: Props) => {
  const index = Math.max(0, floors.indexOf(current ?? ""));
  const progress = useRef(new Animated.Value(index)).current;
  const dragStart = useRef(index);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: index,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [index, progress]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          progress.stopAnimation((value) => {
            dragStart.current = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          const next = Math.max(
            0,
            Math.min(floors.length - 1, dragStart.current - gesture.dy / 50),
          );
          progress.setValue(next);
        },
        onPanResponderRelease: () => {
          progress.stopAnimation((value) => {
            const target = Math.round(value);
            Animated.timing(progress, {
              toValue: target,
              duration: Math.abs(value - target) * 200,
              useNativeDriver: false,
            }).start(() => {
              const floor = floors[target];
              if (floor) {
                onSelect(floor);
              }
            });
          });
        },
      }),
    [floors, onSelect, progress],
  );

  if (floors.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap} {...pan.panHandlers}>
      {floors.map((floor, floorIndex) => {
        const translateY = progress.interpolate({
          inputRange: [floorIndex - 2, floorIndex, floorIndex + 2],
          outputRange: [-ITEM * 2, 0, ITEM * 2],
          extrapolate: "clamp",
        });
        const translateX = progress.interpolate({
          inputRange: [floorIndex - 2, floorIndex, floorIndex + 2],
          outputRange: [ARC_X, 0, ARC_X],
          extrapolate: "clamp",
        });
        const scale = progress.interpolate({
          inputRange: [floorIndex - 1, floorIndex, floorIndex + 1],
          outputRange: [0.82, 1.12, 0.82],
          extrapolate: "clamp",
        });
        const opacity = progress.interpolate({
          inputRange: [
            floorIndex - 2.2,
            floorIndex - 1,
            floorIndex,
            floorIndex + 1,
            floorIndex + 2.2,
          ],
          outputRange: [0, 0.55, 1, 0.55, 0],
          extrapolate: "clamp",
        });
        const selected = floor === current;
        return (
          <Animated.View
            key={floor}
            style={[
              styles.item,
              {
                opacity,
                transform: [{ translateY }, { translateX }, { scale }],
              },
            ]}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={() => onSelect(floor)}
              style={[styles.floor, selected ? styles.floorOn : null]}
            >
              <Text style={[styles.text, selected ? styles.textOn : null]}>{floor}</Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    height: ITEM * 5,
    justifyContent: "center",
    width: 56,
  },
  item: {
    left: 0,
    position: "absolute",
    right: 0,
    top: ITEM * 2,
  },
  floor: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#90CFEA",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    minWidth: 44,
  },
  floorOn: {
    backgroundColor: "#0E96D1",
  },
  text: {
    color: "#ffffff",
    fontWeight: "700",
  },
  textOn: {
    color: "#ffffff",
  },
});
