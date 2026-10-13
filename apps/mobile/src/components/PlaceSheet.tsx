import { Pressable, StyleSheet, Text, View } from "react-native";
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
  onDirections,
  onShare,
  needsSignIn,
  onSignIn,
}: Props) => {
  if (place.kind === "home" || place.kind === "pending") {
    return null;
  }

  return (
    <View style={[styles.sheet, sheet === "collapsed" ? styles.collapsed : null]}>
      <Pressable onPress={onCycle} style={styles.handle} accessibilityRole="button">
        <View style={styles.grabber} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      {sheet !== "collapsed" ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {sheet === "expanded" ? <Text style={styles.detail}>{detail}</Text> : null}
      {needsSignIn ? (
        <Pressable style={styles.primary} onPress={onSignIn}>
          <Text style={styles.primaryText}>Sign in to see this floor</Text>
        </Pressable>
      ) : (
        <View style={styles.actions}>
          <Pressable style={styles.primary} onPress={onDirections}>
            <Text style={styles.primaryText}>Directions</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={onShare}>
            <Text style={styles.secondaryText}>Share</Text>
          </Pressable>
        </View>
      )}
    </View>
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
  title: {
    color: theme.ink,
    fontSize: 22,
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
    marginTop: 16,
  },
  primary: {
    backgroundColor: theme.green,
    borderRadius: 20,
    marginTop: 16,
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
    marginTop: 16,
    paddingHorizontal: 16,
  },
  secondaryText: {
    color: theme.ink,
    fontWeight: "600",
  },
});
