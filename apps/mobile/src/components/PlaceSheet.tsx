import { useMemo, useRef } from "react";
import { Animated, Image, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { locationImage } from "@/lib/locationImage";
import type { Place } from "@/lib/place";
import type { SheetState } from "@/store";
import { theme } from "@/theme";

interface Props {
  place: Place;
  title: string;
  subtitle: string;
  detail: string;
  sheet: SheetState;
  onCycle: () => void;
  onClose: () => void;
  onDirections: () => void;
  onShare: () => void;
  needsSignIn: boolean;
  onSignIn: () => void;
}

export const PlaceSheet = ({
  place,
  title,
  subtitle,
  detail,
  sheet,
  onCycle,
  onClose,
  onDirections,
  onShare,
  needsSignIn,
  onSignIn,
}: Props) => {
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
          const shouldClose = gesture.dy > 100 || gesture.vy > 1.1;
          if (shouldClose) {
            Animated.timing(dragY, {
              toValue: 420,
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              dragY.setValue(0);
              onClose();
            });
            return;
          }
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          if (gesture.dy < -48) {
            onCycle();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        },
      }),
    [dragY, onClose, onCycle],
  );

  if (place.kind === "home" || place.kind === "pending") {
    return null;
  }

  const buildingCode =
    place.kind === "building" || place.kind === "floor" || place.kind === "room"
      ? place.buildingCode
      : undefined;
  const roomName = place.kind === "room" ? place.roomName : undefined;
  const photo = locationImage(buildingCode, roomName);

  return (
    <Animated.View
      style={[
        styles.sheet,
        sheet === "collapsed" ? styles.collapsed : null,
        { transform: [{ translateY: dragY }] },
      ]}
      {...pan.panHandlers}
    >
      <Pressable onPress={onCycle} style={styles.handle} accessibilityRole="button">
        <View style={styles.grabber} />
      </Pressable>
      {photo && sheet !== "collapsed" ? <Image source={photo} style={styles.hero} /> : null}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {sheet === "collapsed" && !needsSignIn ? (
          <Pressable accessibilityLabel="Share" onPress={onShare} style={styles.shareIcon}>
            <Text style={styles.shareIconText}>↗</Text>
          </Pressable>
        ) : null}
      </View>
      {sheet !== "collapsed" ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {sheet === "expanded" ? <Text style={styles.detail}>{detail}</Text> : null}
      {needsSignIn ? (
        <Pressable style={styles.primary} onPress={onSignIn}>
          <Text style={styles.primaryText}>Sign in to see this floor</Text>
        </Pressable>
      ) : (
        <View style={styles.actions}>
          <Pressable style={styles.primary} onPress={onDirections}>
            <Text style={styles.primaryText}>→ Directions</Text>
          </Pressable>
          {sheet !== "collapsed" ? (
            <Pressable style={styles.secondary} onPress={onShare}>
              <Text style={styles.secondaryText}>Share</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: theme.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  collapsed: {
    paddingBottom: 16,
  },
  handle: {
    alignItems: "center",
    paddingVertical: 10,
  },
  grabber: {
    backgroundColor: theme.line,
    borderRadius: 4,
    height: 4,
    width: 48,
  },
  hero: {
    borderRadius: 12,
    height: 140,
    marginBottom: 12,
    width: "100%",
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  title: {
    color: theme.ink,
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
  },
  shareIcon: {
    alignItems: "center",
    backgroundColor: theme.canvas,
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  shareIconText: {
    color: theme.ink,
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.muted,
    marginTop: 4,
  },
  detail: {
    color: theme.ink,
    marginTop: 12,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  primary: {
    backgroundColor: theme.green,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  secondary: {
    borderColor: theme.line,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryText: {
    color: theme.ink,
    fontWeight: "600",
  },
});
