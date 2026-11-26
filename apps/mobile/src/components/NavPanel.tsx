import type { PreciseRoute } from "@cmumaps/common";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BuildingIcon, ZapIcon } from "@/components/Icons";
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

export const formatRouteSummary = (route: PreciseRoute | undefined) => {
  const feet = Math.round(route?.path.distance ?? 0);
  const minutes = Math.max(1, Math.round(feet / 250));
  const arrival = new Date(Date.now() + minutes * 60 * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const distanceValue = feet >= 1000 ? (feet / 5280).toFixed(1) : String(feet);
  const distanceUnit = feet >= 1000 ? "mi" : "ft";
  return { feet, distanceValue, distanceUnit, minutes, arrival };
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
  const stats = formatRouteSummary(route);
  const ready = Boolean(route && canGo && !error);

  if (navigating) {
    return (
      <View style={styles.tripBar}>
        <View style={styles.stats}>
          <Stat value={stats.arrival} label="arrival" />
          <Stat value={String(stats.minutes)} label="min" />
          <Stat value={stats.distanceValue} label={stats.distanceUnit} />
        </View>
        <Pressable onPress={onEnd} style={styles.end}>
          <Text style={styles.actionText}>End</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.cardShadow}>
      <View style={styles.card}>
        <View style={styles.tabBand}>
          {(["Fastest", "Inside"] as const).map((kind) => {
            const available = Boolean(routes?.[kind]);
            const active = kind === selected;
            const tint = active ? theme.brandDark : available ? theme.ink : theme.subtle;
            return (
              <Pressable
                key={kind}
                disabled={!available}
                onPress={() => onSelect(kind)}
                style={[styles.tab, active ? styles.tabOn : null]}
              >
                {kind === "Fastest" ? (
                  <ZapIcon size={18} color={tint} />
                ) : (
                  <BuildingIcon size={18} color={tint} />
                )}
                <Text style={[styles.tabLabel, { color: tint }]}>
                  {kind === "Inside" ? "Indoor" : "Fastest"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.footerBand}>
          <View style={styles.stats}>
            {ready ? (
              <>
                <Stat value={stats.arrival} label="arrival" />
                <Stat value={String(stats.minutes)} label="min" />
                <Stat value={stats.distanceValue} label={stats.distanceUnit} />
              </>
            ) : (
              <Text style={styles.unavailable} numberOfLines={2}>
                {error || "Path unavailable"}
              </Text>
            )}
          </View>
          <Pressable
            onPress={onGo}
            style={[styles.go, !ready ? styles.goDisabled : null]}
            disabled={!ready}
          >
            <Text style={styles.actionText}>Go</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  cardShadow: {
    borderRadius: 14,
    marginBottom: 22,
    marginHorizontal: 14,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
  card: {
    backgroundColor: theme.paper,
    borderRadius: 14,
    overflow: "hidden",
  },
  tabBand: {
    backgroundColor: theme.canvas,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tab: {
    alignItems: "center",
    borderRadius: 11,
    gap: 4,
    minWidth: 82,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabOn: {
    backgroundColor: theme.chip,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  footerBand: {
    alignItems: "center",
    backgroundColor: theme.paper,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tripBar: {
    alignItems: "center",
    backgroundColor: theme.paper,
    borderRadius: 14,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 22,
    marginHorizontal: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
  stats: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingRight: 4,
  },
  stat: {
    alignItems: "center",
    flexShrink: 1,
  },
  statValue: {
    color: theme.ink,
    fontSize: 21,
    fontWeight: "600",
  },
  statLabel: {
    color: theme.muted,
    fontSize: 13,
    marginTop: 2,
  },
  unavailable: {
    color: theme.muted,
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
  },
  go: {
    alignItems: "center",
    backgroundColor: theme.green,
    borderRadius: 100,
    minWidth: 82,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  goDisabled: {
    backgroundColor: theme.disabled,
  },
  end: {
    alignItems: "center",
    backgroundColor: theme.danger,
    borderRadius: 100,
    minWidth: 82,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  actionText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
});
