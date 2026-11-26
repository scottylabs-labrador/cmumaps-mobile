import type { PreciseRoute } from "@cmumaps/common";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { RouteKind } from "@/store";
import { theme } from "@/theme";

interface Props {
  routes: Record<string, PreciseRoute> | undefined;
  selected: RouteKind;
  navigating: boolean;
  error?: string;
  canGo?: boolean;
  onSelect: (route: RouteKind) => void;
  onGo: () => void;
  onEnd: () => void;
}

const summary = (route: PreciseRoute | undefined) => {
  const distance = Math.round(route?.path.distance ?? 0);
  const minutes = Math.round(distance / 100);
  const arrival = new Date(Date.now() + minutes * 60 * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return { distance, minutes, arrival };
};

export const NavPanel = ({
  routes,
  selected,
  navigating,
  error,
  canGo = true,
  onSelect,
  onGo,
  onEnd,
}: Props) => {
  const route = routes?.[selected];
  const stats = summary(route);

  if (navigating) {
    return (
      <View style={styles.tripBar}>
        <View style={styles.stats}>
          <Stat value={stats.arrival} label="arrival" />
          <Stat value={String(stats.minutes)} label="min" />
          <Stat value={String(stats.distance)} label="ft" />
        </View>
        <Pressable onPress={onEnd} style={styles.end}>
          <Text style={styles.primaryText}>End</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.sheet}>
      <View style={styles.handleRow}>
        <View style={styles.grabber} />
      </View>
      <View style={styles.chips}>
        {(["Fastest", "Inside"] as const).map((kind) => {
          const available = Boolean(routes?.[kind]);
          const active = kind === selected;
          return (
            <Pressable
              key={kind}
              disabled={!available}
              onPress={() => onSelect(kind)}
              style={[styles.chip, active ? styles.chipOn : null]}
            >
              <Text style={[styles.chipText, !available ? styles.chipOff : null]}>
                {kind === "Inside" ? "Indoor" : kind}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.footer}>
        <View style={styles.stats}>
          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <>
              <Stat value={stats.arrival} label="arrival" />
              <Stat value={String(stats.minutes)} label="min" />
              <Stat value={String(stats.distance)} label="ft" />
            </>
          )}
        </View>
        <Pressable
          onPress={onGo}
          style={[styles.go, !(route && canGo) ? styles.goDisabled : null]}
          disabled={!(route && canGo)}
        >
          <Text style={styles.primaryText}>Go</Text>
        </Pressable>
      </View>
    </View>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: theme.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 8,
  },
  handleRow: {
    alignItems: "center",
    paddingBottom: 8,
    paddingTop: 4,
  },
  grabber: {
    backgroundColor: theme.line,
    borderRadius: 4,
    height: 4,
    width: 48,
  },
  tripBar: {
    alignItems: "center",
    backgroundColor: theme.paper,
    borderRadius: 20,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginHorizontal: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    backgroundColor: theme.canvas,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipOn: {
    backgroundColor: theme.chip,
  },
  chipText: {
    color: theme.ink,
    fontWeight: "700",
  },
  chipOff: {
    color: theme.muted,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  stats: {
    flexDirection: "row",
    flex: 1,
    gap: 20,
  },
  statValue: {
    color: theme.ink,
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    color: theme.muted,
  },
  error: {
    color: theme.danger,
    flex: 1,
  },
  go: {
    alignItems: "center",
    backgroundColor: theme.green,
    borderRadius: 24,
    minWidth: 88,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  goDisabled: {
    opacity: 0.4,
  },
  end: {
    backgroundColor: theme.danger,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  primaryText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
